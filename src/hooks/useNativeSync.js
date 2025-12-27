import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { BudgetPlugin } from "../plugins/BudgetPlugin";
import { parseAndCreateRecord } from "../utils/notiParser";
import { useBudgetDB } from "./useBudgetDB";

export const useNativeSync = () => {
  // db 객체를 함께 가져와서 초기화 상태를 확인합니다.
  const { db, add, getAll } = useBudgetDB();
  const isRunningRef = useRef(false);

  const sync = async () => {
    // 중요: DB가 아직 초기화 전(null)이라면 실행하지 않고 중단합니다.
    if (!db) {
      console.log("[Native Sync] DB가 아직 준비되지 않아 동기화를 대기합니다.");
      return;
    }

    if (isRunningRef.current) return;

    const platform = Capacitor.getPlatform();
    if (platform !== "android") return;

    isRunningRef.current = true;
    console.log("[Native Sync] 동기화 프로세스 시작...");

    try {
      const permission = await BudgetPlugin.hasNotificationAccess();
      if (!permission || !permission.granted) {
        console.log("[Native Sync] 알림 접근 권한이 없습니다.");
        return;
      }

      const result = await BudgetPlugin.getPendingNotifications();
      const jsonString = result.data || "[]";
      const notis = JSON.parse(jsonString);

      if (!Array.isArray(notis) || notis.length === 0) {
        console.log("[Native Sync] 처리할 새로운 알림이 없습니다.");
        return;
      }

      console.log(`[Native Sync] 파싱할 알림 개수: ${notis.length}`);

      const chapters = await getAll("chapters");
      const records = await getAll("records");

      for (const noti of notis) {
        const combinedText = `${noti.title} ${noti.text}`;
        const recordData = parseAndCreateRecord(combinedText);

        if (!recordData) {
          console.log("[Native Sync] 파싱 실패 문자열:", combinedText);
          continue;
        }

        const isDuplicate = records.some((r) => r.date === recordData.date && r.amount === recordData.amount && r.title === recordData.title);

        if (isDuplicate) {
          console.log("[Native Sync] 이미 저장된 데이터 스킵:", recordData.title);
          continue;
        }

        let targetChapter = chapters.find((c) => c.title === recordData.chapterTitle);

        if (!targetChapter) {
          console.log("[Native Sync] 새 챕터 생성:", recordData.chapterTitle);
          const newChapterId = await add("chapters", {
            title: recordData.chapterTitle,
            createdAt: new Date(recordData.date),
            order: chapters.length,
            isTemporary: false,
          });

          targetChapter = {
            chapterId: newChapterId,
            title: recordData.chapterTitle,
          };
          chapters.push(targetChapter);
        }

        const { chapterTitle, ...finalRecord } = recordData;
        await add("records", {
          ...finalRecord,
          chapterId: targetChapter.chapterId,
        });
        console.log("[Native Sync] 레코드 추가 완료:", finalRecord.title);
      }

      // 3. 네이티브 저장소 비우기
      await BudgetPlugin.clearNotifications();

      // ★ UI 갱신을 위해 커스텀 이벤트를 발생시킵니다.
      window.dispatchEvent(new CustomEvent("budget-db-updated"));
      console.log("[Native Sync] 동기화 및 네이티브 큐 청소 완료");
    } catch (error) {
      console.error("[Native Sync] 실행 중 에러 발생:", error);
    } finally {
      isRunningRef.current = false;
    }
  };

  useEffect(() => {
    let appStateListener;

    const setupSync = async () => {
      // 1. 초기 로드 시 db가 있다면 실행
      if (db) await sync();

      // 2. 앱 상태 변경 감지 리스너 등록 (await를 사용하여 경고 해결)
      appStateListener = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          console.log("[Native Sync] 앱 활성화 감지 - 동기화 시도");
          sync();
        }
      });
    };

    setupSync();

    return () => {
      if (appStateListener) appStateListener.remove();
    };
    // db가 준비되었을 때(null -> object) sync가 한 번 더 돌아가도록 종속성에 추가합니다.
  }, [db, add, getAll]);
};
