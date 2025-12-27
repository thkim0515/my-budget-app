import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { BudgetPlugin } from "../plugins/BudgetPlugin";
import { parseAndCreateRecord } from "../utils/notiParser";
import { useBudgetDB } from "./useBudgetDB";

export const useNativeSync = () => {
  const { add, getAll } = useBudgetDB();
  const isRunningRef = useRef(false);

  useEffect(() => {
    // 1. 플랫폼 및 플러그인 로드 상태 확인
    const platform = Capacitor.getPlatform();
    console.log(`[Native Sync] 현재 플랫폼: ${platform}`);

    // 이 로그에서 { getPendingNotifications: f, ... } 처럼 메서드들이 보여야 합니다.
    console.log("[Native Sync] BudgetPlugin 객체 상태:", BudgetPlugin);

    if (platform !== "android") {
      console.log("[Native Sync] 안드로이드가 아니므로 동기화를 중단합니다.");
      return;
    }

    if (isRunningRef.current) return;

    const sync = async () => {
      isRunningRef.current = true;
      console.log("[Native Sync] 동기화 프로세스 시작...");

      try {
        // 2. 알림 데이터 가져오기 호출
        console.log("[Native Sync] getPendingNotifications 호출 중...");
        const result = await BudgetPlugin.getPendingNotifications();
        console.log("[Native Sync] 네이티브 응답 데이터:", result);

        const jsonString = result.data || "[]";
        const notis = JSON.parse(jsonString);
        console.log(`[Native Sync] 파싱된 알림 개수: ${notis.length}`);

        if (!Array.isArray(notis) || notis.length === 0) {
          console.log("[Native Sync] 처리할 새로운 알림이 없습니다.");
          return;
        }

        const chapters = await getAll("chapters");
        const records = await getAll("records");

        for (const noti of notis) {
          const combinedText = `${noti.title} ${noti.text}`;
          const recordData = parseAndCreateRecord(combinedText);

          if (!recordData) {
            console.log("[Native Sync] 파싱 실패 문자열:", combinedText);
            continue;
          }

          // 중복 체크 로직
          const isDuplicate = records.some((r) => r.date === recordData.date && r.amount === recordData.amount && r.title === recordData.title);

          if (isDuplicate) {
            console.log("[Native Sync] 이미 저장된 데이터 스킵:", recordData.title);
            continue;
          }

          let targetChapter = chapters.find((c) => c.title === recordData.chapterTitle);

          // 챕터 자동 생성
          if (!targetChapter) {
            console.log("[Native Sync] 새 챕터 생성:", recordData.chapterTitle);
            const newChapterId = await add("chapters", {
              title: recordData.chapterTitle,
              createdAt: new Date(recordData.date),
              order: chapters.length,
              isTemporary: false,
            });

            targetChapter = { chapterId: newChapterId };
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
        console.log("[Native Sync] clearNotifications 호출 중...");
        await BudgetPlugin.clearNotifications();
        console.log("[Native Sync] 동기화 및 네이티브 큐 청소 완료");
      } catch (error) {
        console.error("[Native Sync] 실행 중 에러 발생:", error);
        if (error.message) {
          console.error("[Native Sync] 상세 에러 메시지:", error.message);
        }
      } finally {
        isRunningRef.current = false;
      }
    };

    const checkPermissionAndSync = async () => {
      try {
        console.log("[Native Sync] 권한 확인 시도...");
        const result = await BudgetPlugin.hasNotificationAccess();
        console.log("[Native Sync] 권한 확인 결과:", result);

        if (!result || !result.granted) {
          console.log("[Native Sync] 알림 접근 권한이 없습니다.");
          return;
        }

        await sync();
      } catch (error) {
        console.error("[Native Sync] 권한 확인 단계 실패:", error);
      }
    };

    checkPermissionAndSync();
  }, [add, getAll]);
};
