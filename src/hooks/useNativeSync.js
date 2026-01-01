import { useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { BudgetPlugin } from "../plugins/BudgetPlugin";
import { parseAndCreateRecord } from "../utils/notiParser";
import { useBudgetDB } from "./useBudgetDB";
import { useSettings } from "../context/SettingsContext";

export const useNativeSync = () => {
  // 중복 검사를 위해 getAllRaw(삭제된 것 포함 전체) 사용 권장
  const { db, add, getAll, getAllRaw, deleteItem } = useBudgetDB();
  const { settings } = useSettings();
  const isRunningRef = useRef(false);

  const sync = useCallback(async () => {
    if (!db) return;
    if (isRunningRef.current) return;

    const platform = Capacitor.getPlatform();
    if (platform !== "android") return;

    isRunningRef.current = true;
    // console.log("[Native Sync] 동기화 프로세스 시작...");

    try {
      const permission = await BudgetPlugin.hasNotificationAccess();
      if (!permission || !permission.granted) return;

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
              !r.isDeleted && // 삭제되지 않은 것 중에서
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

        // 3. [개선] 스마트 중복 방지 (시간차 기반)
        // 조건: 금액 일치 AND 상호명 유사 AND 시간차 5분(300000ms) 이내
        // (기존의 날짜 단순 비교는 하루에 같은 곳 2번 결제 시 문제 발생)
        const isDuplicate = records.some((r) => {
          if (r.isDeleted) return false;

          const isSameAmount = r.amount === recordData.amount;
          const isSameTitle = r.title.includes(recordData.title) || recordData.title.includes(r.title);

          // noti.time은 안드로이드가 준 발생 시간(ms)
          // r.createdAt은 DB에 저장된 시간(Date obj or string)
          const dbTime = new Date(r.createdAt).getTime();
          const notiTime = noti.time || Date.now();
          const timeDiff = Math.abs(dbTime - notiTime);

          return isSameAmount && isSameTitle && timeDiff < 300000;
        });

        if (isDuplicate) {
          console.warn("[Native Sync] 중복 알림 차단:", recordData.title);
          continue;
        }

        // 4. 챕터 매핑 (없으면 생성)
        let targetChapter = chapters.find((c) => c.title === recordData.chapterTitle);

        let targetChapterId;
        if (targetChapter) {
          targetChapterId = targetChapter.chapterId;
        } else {
          // add가 UUID를 반환하므로 그대로 사용
          targetChapterId = await add("chapters", {
            title: recordData.chapterTitle,
            createdAt: new Date(recordData.date),
            order: chapters.length,
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

        // noti.time이 있으면 그걸 생성일로 사용 (정확도 향상)
        const creationTime = noti.time ? new Date(noti.time) : new Date();

        const newRecordId = await add("records", {
          ...finalRecord,
          createdAt: creationTime,
          chapterId: targetChapterId,
        });

        // 메모리 상 레코드 목록 갱신 (다음 루프 중복 체크용)
        records.push({
          ...finalRecord,
          id: newRecordId,
          createdAt: creationTime,
          chapterId: targetChapterId,
        });

        console.log("✅ [Native Sync] 저장 완료:", finalRecord.title);
      }

      await BudgetPlugin.clearNotifications();

      // [핵심] 클라우드 동기화 트리거 발동
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
