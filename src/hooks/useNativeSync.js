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
          // 🔥 제목과 내용을 합쳐서 파싱 시도 (카카오톡 대응)
          const combinedText = `${noti.title} ${noti.text}`;
          const recordData = parseAndCreateRecord(combinedText);
          
          if (!recordData) {
            console.log("[Native Sync] 파싱 실패 또는 제외 대상:", combinedText);
            continue;
          }

          // 중복 체크 (날짜, 금액, 제목이 모두 같으면 건너뜀)
          const isDuplicate = records.some(
            (r) => r.date === recordData.date && 
                   r.amount === recordData.amount && 
                   r.title === recordData.title
          );
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

        // 처리가 끝나면 알림 목록 비우기
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
        // 권한이 없을 경우 사용자에게 요청 (이미 설정화면 이동 버튼이 있으므로 선택사항)
        return;
      }

      await sync();
    };

    checkPermissionAndSync();
  }, [add, getAll]);
};