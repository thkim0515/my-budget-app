import { useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { BudgetPlugin } from "../plugins/BudgetPlugin";
import { parseAndCreateRecord } from "../utils/notiParser";
import { useBudgetDB } from "./useBudgetDB";
import { useSettings } from "../context/SettingsContext"; // Context 훅 임포트

export const useNativeSync = () => {
  const { db, add, getAll, deleteItem } = useBudgetDB();
  const { settings } = useSettings(); // 중앙 설정값 가져오기
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
      if (!permission || !permission.granted) return;

      const result = await BudgetPlugin.getPendingNotifications();
      const jsonString = result.data || "[]";
      const notis = JSON.parse(jsonString);

      if (!Array.isArray(notis) || notis.length === 0) {
        isRunningRef.current = false;
        return;
      }

      // SettingsContext에서 이미 "false" 여부를 판단하여 true/false로 관리
      const { autoSaveIncome, autoSaveExpense } = settings;

      const chapters = await getAll("chapters");
      let records = await getAll("records");

      for (const noti of notis) {
        const combinedText = `${noti.title} ${noti.text}`;
        const recordData = parseAndCreateRecord(combinedText);

        if (!recordData) continue;

        //  토글 설정 체크 로직 (변수명 동일하게 유지)
        if (recordData.type === "income" && !autoSaveIncome) continue;
        if (recordData.type === "expense" && !autoSaveExpense) continue;

        // 결제 취소 처리 
        if (recordData.isCancellation) {
          const target = records.find(
            (r) =>
              r.amount === recordData.amount &&
              (r.title.includes(recordData.title) ||
                recordData.title.includes(r.title))
          );
          if (target) {
            await deleteItem("records", target.id);
            records = records.filter((r) => r.id !== target.id);
            console.log("[Native Sync] 취소 처리 완료: ", target.title);
          }
          continue;
        }

        // 중복 알림 방지 
        const isDuplicate = records.some(
          (r) =>
            r.date === recordData.date &&
            r.amount === recordData.amount &&
            (r.title.includes(recordData.title) ||
              recordData.title.includes(r.title))
        );

        if (isDuplicate) {
          console.log("[Native Sync] 중복 스킵:", recordData.title);
          continue;
        }

        // 저장 로직 (기존 로직 유지)
        let targetChapter = chapters.find(
          (c) => c.title === recordData.chapterTitle
        );
        if (!targetChapter) {
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

        const { chapterTitle, isCancellation, ...finalRecord } = recordData;
        const newRecordId = await add("records", {
          ...finalRecord,
          chapterId: targetChapter.chapterId,
        });
        records.push({ ...finalRecord, id: newRecordId });
      }

      await BudgetPlugin.clearNotifications();
      window.dispatchEvent(new CustomEvent("budget-db-updated"));
    } catch (error) {
      console.error("[Native Sync] 에러:", error);
    } finally {
      isRunningRef.current = false;
    }
  }, [db, add, getAll, deleteItem, settings]); // settings가 변경되면 sync 함수 갱신

  useEffect(() => {
    let appStateListener;

    const setupSync = async () => {
      if (db) await sync();
      appStateListener = await App.addListener(
        "appStateChange",
        ({ isActive }) => {
          if (isActive) sync();
        }
      );
    };

    setupSync();

    return () => {
      if (appStateListener) {
        appStateListener.remove();
      }
    };
  }, [db, sync]);
};