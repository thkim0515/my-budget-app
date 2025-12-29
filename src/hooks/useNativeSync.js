import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { BudgetPlugin } from "../plugins/BudgetPlugin";
import { parseAndCreateRecord } from "../utils/notiParser";
import { useBudgetDB } from "./useBudgetDB";

export const useNativeSync = () => {
  const { db, add, getAll, deleteItem } = useBudgetDB();
  const isRunningRef = useRef(false);

  const sync = async () => {
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

      // 토글 설정값 읽기 (기본값 true)
      const autoSaveIncome = localStorage.getItem("autoSaveIncome") !== "false";
      const autoSaveExpense = localStorage.getItem("autoSaveExpense") !== "false";

      const chapters = await getAll("chapters");
      let records = await getAll("records");

      for (const noti of notis) {
        const combinedText = `${noti.title} ${noti.text}`;
        const recordData = parseAndCreateRecord(combinedText);

        if (!recordData) continue;

        // 1. 토글 설정 체크
        if (recordData.type === "income" && !autoSaveIncome) continue;
        if (recordData.type === "expense" && !autoSaveExpense) continue;

        // 2. 결제 취소 처리
        if (recordData.isCancellation) {
          const target = records.find(r => 
            r.amount === recordData.amount && 
            (r.title.includes(recordData.title) || recordData.title.includes(r.title))
          );
          if (target) {
            await deleteItem("records", target.id);
            records = records.filter(r => r.id !== target.id);
            console.log("[Native Sync] 취소 처리 완료: ", target.title);
          }
          continue; // 취소 알림 자체는 등록하지 않음
        }

        // 3. 중복 알림 방지 (날짜 + 금액 + 유사한 제목)
        const isDuplicate = records.some((r) => 
          r.date === recordData.date && 
          r.amount === recordData.amount && 
          (r.title.includes(recordData.title) || recordData.title.includes(r.title))
        );

        if (isDuplicate) {
          console.log("[Native Sync] 중복 스킵:", recordData.title);
          continue;
        }

        // 4. 저장 로직
        let targetChapter = chapters.find((c) => c.title === recordData.chapterTitle);
        if (!targetChapter) {
          const newChapterId = await add("chapters", {
            title: recordData.chapterTitle,
            createdAt: new Date(recordData.date),
            order: chapters.length,
            isTemporary: false,
          });
          targetChapter = { chapterId: newChapterId, title: recordData.chapterTitle };
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
  };

  useEffect(() => {
    let appStateListener;
    const setupSync = async () => {
      if (db) await sync();
      appStateListener = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) sync();
      });
    };
    setupSync();
    return () => { if (appStateListener) appStateListener.remove(); };
  }, [db, add, getAll]);
};