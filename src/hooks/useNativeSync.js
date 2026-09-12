import { useEffect, useRef, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { BudgetPlugin } from "../plugins/BudgetPlugin";
import { parseAndCreateRecord, parseAccumulatedAmount } from "../utils/notiParser";
import { getCurrentYm } from "../utils/cardLimit";
import { useBudgetDB } from "./useBudgetDB";
import { useSettings } from "../context/SettingsContext";

export const useNativeSync = () => {
  // 중복 검사를 위해 getAllRaw(삭제된 것 포함 전체) 사용
  const { db, add, getAll, getAllRaw, deleteItem } = useBudgetDB();
  const { settings, updateSetting } = useSettings();
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

      // [디버그] 처리 후 사라지는 pending 큐와 별개로, 실제로 캡처된 알림 원문을
      // 로컬에 최근 20건 남겨서 설정 화면에서 파싱 성공/실패 여부를 확인할 수 있게 한다.
      try {
        const prevLog = JSON.parse(localStorage.getItem("notiDebugLog") || "[]");
        const newLog = [
          ...notis.map((n) => ({ title: n.title, text: n.text, time: n.time || Date.now() })),
          ...prevLog,
        ].slice(0, 20);
        localStorage.setItem("notiDebugLog", JSON.stringify(newLog));
      } catch (e) {
        // 디버그 로그 저장 실패는 무시(핵심 기능에 영향 없음)
      }

      const { autoSaveIncome, autoSaveExpense } = settings;

      // 챕터는 Active한 것만, 레코드는 중복 체크를 위해 전체(Raw) 로드
      const chapters = await getAll("chapters");
      let records = await getAllRaw("records");

      for (const noti of notis) {
       try {
        const combinedText = `${noti.title} ${noti.text}`;
        const recordData = parseAndCreateRecord(combinedText);

        if (!recordData) continue;

        // 0. 카드 한도 표시용 "당월 누적 사용액" 갱신.
        //    지출 자동저장 설정(autoSaveExpense)과 무관하게 항상 반영되어야
        //    카드 한도 표시가 자동저장 On/Off와 상관없이 상시 동작한다.
        if (recordData.type === "expense" && recordData.source === settings.cardLimitProvider) {
          const accumulated = parseAccumulatedAmount(combinedText);
          if (accumulated != null) {
            updateSetting("cardLimitAccumulated", accumulated);
            updateSetting("cardLimitAccumulatedProvider", recordData.source);
            updateSetting("cardLimitAccumulatedYm", getCurrentYm());
          }
        }

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
       } catch (itemError) {
         // [핵심] 알림 하나를 처리하다 실패해도 전체 큐를 막지 않는다.
         // 예전에는 여기서 던져진 에러가 바로 바깥 catch로 빠져나가 clearNotifications()가
         // 영영 호출되지 않았고, 그 결과 문제의 알림 하나가 대기열에 계속 남아 매 폴링마다
         // 재시도만 반복하며 그 뒤에 들어오는 모든 알림까지 함께 발이 묶이는 문제가 있었다.
         console.error("[Native Sync] 개별 알림 처리 실패 (건너뜀):", noti.title, noti.text, itemError?.name, itemError?.message);
       }
      }

      await BudgetPlugin.clearNotifications();

      // 클라우드 동기화 트리거 발동
      window.dispatchEvent(new CustomEvent("budget-db-updated"));
    } catch (error) {
      console.error("[Native Sync] 에러:", error?.name, error?.message, error?.stack);
    } finally {
      isRunningRef.current = false;
    }
  }, [db, add, getAll, getAllRaw, deleteItem, settings, updateSetting]);

  useEffect(() => {
    let appStateListener;
    let intervalId;
    // [수정] setupSync는 비동기라 등록이 끝나기 전에 effect가 재실행(cleanup)될 수 있다.
    // 그 경우 위 let 변수들이 아직 할당 전이라 cleanup에서 못 지우고 리스너/interval이
    // 새어나가 sync()가 중복으로 여러 번 도는 원인이 됐다. cancelled 플래그로 방지한다.
    let cancelled = false;

    const setupSync = async () => {
      if (db) await sync();
      if (cancelled) return;

      const listener = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) sync();
      });
      if (cancelled) {
        listener.remove();
        return;
      }
      appStateListener = listener;

      // [근본 수정] appStateChange는 "백그라운드 → 포그라운드로 전환되는 순간"에만 발생한다.
      // 앱을 이미 켜놓은 채로 알림을 받으면 다음에 앱을 나갔다 들어오기 전까지 반영되지 않던
      // 문제가 있어, 앱이 활성 상태인 동안에는 주기적으로도 대기 중인 알림을 확인한다.
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") sync();
      }, 20000);
    };

    setupSync();

    return () => {
      cancelled = true;
      if (appStateListener) {
        appStateListener.remove();
      }
      if (intervalId) clearInterval(intervalId);
    };
  }, [db, sync]);
};