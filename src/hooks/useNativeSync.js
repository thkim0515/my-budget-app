import { useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { BudgetPlugin } from "../plugins/BudgetPlugin";
import { parseAndCreateRecord } from "../utils/notiParser";
import { useBudgetDB } from "./useBudgetDB";
import { useSettings } from "../context/SettingsContext";

export const useNativeSync = () => {
  // 중복 검사를 위해 getAllRaw(삭제된 것 포함 전체) 사용
  const { db, add, getAll, getAllRaw, deleteItem } = useBudgetDB();
  const { settings } = useSettings();
  const isRunningRef = useRef(false);

  const sync = useCallback(async () => {
    if (!db) return;
    if (isRunningRef.current) return;

    const platform = Capacitor.getPlatform();
    if (platform !== "android") return;

    isRunningRef.current = true;
    console.log("[Native Sync] 동기화 프로세스 시작...");

    try {
      const permission = await BudgetPlugin.hasNotificationAccess();
      if (!permission || !permission.granted) {
        isRunningRef.current = false;
        return;
      }

      const result = await BudgetPlugin.getPendingNotifications();
      const jsonString = result.data || "[]";
      const notis = JSON.parse(jsonString);

      if (!Array.isArray(notis) || notis.length === 0) {
        isRunningRef.current = false;
        return;
      }

      console.log(`📩 ${notis.length}개의 새 알림 감지`);

      const { autoSaveIncome, autoSaveExpense } = settings;

      // 챕터는 Active한 것만, 레코드는 중복 체크를 위해 전체(Raw) 로드
      const chapters = await getAll("chapters");
      let records = await getAllRaw("records");

      for (const noti of notis) {
        const combinedText = `${noti.title} ${noti.text}`;
        const recordData = parseAndCreateRecord(combinedText);

        if (!recordData) continue;

        // 1. 설정에 따른 필터링
        if (recordData.type === "income" && !autoSaveIncome) continue;
        if (recordData.type === "expense" && !autoSaveExpense) continue;

        // 2. 결제 취소 처리
        if (recordData.isCancellation) {
          // 같은 금액, 비슷한 상호명을 가진 최근 내역 찾기
          const target = records.find(
            (r) =>
              !r.isDeleted && 
              r.amount === recordData.amount &&
              (r.title.includes(recordData.title) || recordData.title.includes(r.title))
          );
          if (target) {
            await deleteItem("records", target.id);
            // 메모리 상 목록에서도 제거 (중복 처리 방지)
            records = records.map((r) => (r.id === target.id ? { ...r, isDeleted: true } : r));
            console.log("[Native Sync] 취소 처리 완료:", target.title);
          }
          continue;
        }

        // 3. [개선] 초단위 정밀 중복 방지 (연달아 결제 대응)
        // 조건: 금액 일치 AND 상호명 유사 AND 시간차 1초(1000ms) 미만
        // 시스템에 의해 거의 동시에 들어오는 중복 알림만 차단하고, 실제 연달아 결제한 내역은 저장함
        const isDuplicate = records.some((r) => {
          if (r.isDeleted) return false;

          const isSameAmount = r.amount === recordData.amount;
          const isSameTitle = r.title === recordData.title || r.title.includes(recordData.title) || recordData.title.includes(r.title);

          const dbTime = new Date(r.createdAt).getTime();
          const notiTime = noti.time || Date.now();
          const timeDiff = Math.abs(dbTime - notiTime);

          return isSameAmount && isSameTitle && timeDiff < 1000;
        });

        if (isDuplicate) {
          console.warn("[Native Sync] 중복 알림 차단 (1초 이내 동일 데이터):", recordData.title);
          continue;
        }

        // 4. 챕터 매핑 (없으면 생성)
        // 인메모리 캐시 먼저 확인 후 DB 재조회로 race condition 방지
        let targetChapter = chapters.find(
          (c) => c.title === recordData.chapterTitle && !c.isTemporary
        );

        if (!targetChapter) {
          const freshChapters = await getAll("chapters");
          targetChapter = freshChapters.find(
            (c) => c.title === recordData.chapterTitle && !c.isTemporary
          );
          if (targetChapter && !chapters.some((c) => c.chapterId === targetChapter.chapterId)) {
            chapters.push(targetChapter);
          }
        }

        let targetChapterId;
        if (targetChapter) {
          targetChapterId = targetChapter.chapterId;
        } else {
          const allChapters = await getAll("chapters");
          targetChapterId = await add("chapters", {
            title: recordData.chapterTitle,
            createdAt: new Date(recordData.date),
            order: allChapters.filter((c) => !c.isTemporary).length,
            isTemporary: false,
          });
          // 메모리 상 챕터 목록 갱신
          chapters.push({
            chapterId: targetChapterId,
            title: recordData.chapterTitle,
          });
        }

        // 5. 최종 저장
        const { chapterTitle, isCancellation, ...finalRecord } = recordData;

        // 알림 발생 시간(noti.time)을 생성일로 사용하여 정확도 유지
        const creationTime = noti.time ? new Date(noti.time) : new Date();

        // inputMode: "auto" 필드를 추가하여 자동 지출 목록으로 분류
        const newRecordId = await add("records", {
          ...finalRecord,
          createdAt: creationTime,
          chapterId: targetChapterId,
          inputMode: "auto",
        });

        // 메모리 상 레코드 목록 갱신 (다음 루프 중복 체크용)
        records.push({
          ...finalRecord,
          id: newRecordId,
          createdAt: creationTime,
          chapterId: targetChapterId,
          inputMode: "auto",
        });

        console.log("✅ [Native Sync] 저장 완료:", finalRecord.title);
      }

      await BudgetPlugin.clearNotifications();

      // 클라우드 동기화 트리거 발동
      window.dispatchEvent(new CustomEvent("budget-db-updated"));
    } catch (error) {
      console.error("[Native Sync] 에러:", error);
    } finally {
      isRunningRef.current = false;
    }
  }, [db, add, getAll, getAllRaw, deleteItem, settings]);

  useEffect(() => {
    let appStateListener;

    const setupSync = async () => {
      if (db) await sync();

      appStateListener = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) sync();
      });
    };

    setupSync();

    return () => {
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, [db, sync]);
};