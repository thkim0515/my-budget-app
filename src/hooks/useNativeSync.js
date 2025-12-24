import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { BudgetPlugin } from "../plugins/BudgetPlugin";
import { parseAndCreateRecord } from "../utils/notiParser";
import { useBudgetDB } from "./useBudgetDB";

export const useNativeSync = () => {
  const { add, getAll } = useBudgetDB();
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (Capacitor.getPlatform() !== "android") return;
    if (isRunningRef.current) return;

    const sync = async () => {
      isRunningRef.current = true;

      try {
        const result = await BudgetPlugin.getPendingNotifications();
        const notis = JSON.parse(result.data || "[]");

        if (!Array.isArray(notis) || notis.length === 0) return;

        const chapters = await getAll("chapters");
        const records = await getAll("records");

        for (const noti of notis) {
          const recordData = parseAndCreateRecord(noti.text);
          if (!recordData) continue;

          const isDuplicate = records.some((r) => r.date === recordData.date && r.amount === recordData.amount && r.title === recordData.title);
          if (isDuplicate) continue;

          let targetChapter = chapters.find((c) => c.title === recordData.chapterTitle);

          if (!targetChapter) {
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
        }

        await BudgetPlugin.clearNotifications();
        console.log("[Native Sync] 완료");
      } catch (error) {
        console.error("[Native Sync] 실패", error);
      } finally {
        isRunningRef.current = false;
      }
    };

    const checkPermissionAndSync = async () => {
      const result = await BudgetPlugin.hasNotificationAccess();

      if (!result.granted) {
        const go = window.confirm("자동 지출 기록을 위해 알림 접근 권한이 필요합니다.\n설정 화면으로 이동하시겠습니까?");

        if (go) {
          await BudgetPlugin.openNotificationAccessSettings();
        }
        return;
      }

      await sync();
    };

    checkPermissionAndSync();
  }, [add, getAll]);
};
