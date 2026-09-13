/* src/hooks/useStickyCardLimitNotification.js */
import { useEffect, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { BudgetPlugin } from "../plugins/BudgetPlugin";
import { useSettings } from "../context/SettingsContext";
import { useBudgetDB } from "./useBudgetDB";
import { computeCardUsage, getCurrentYm } from "../utils/cardLimit";
import { formatNumber } from "../utils/numberFormat";

/**
 * 설정에서 "상태바 고정 알림"을 켜면 남은 한도를 상태바에 계속 표시하고,
 * 끄면 알림을 완전히 제거해 다시 생기지 않게 한다. (App 최상단에서 항상 마운트되어야 함)
 */
export function useStickyCardLimitNotification() {
  const { settings } = useSettings();
  const { db, getAll } = useBudgetDB();

  const sync = useCallback(async () => {
    if (Capacitor.getPlatform() !== "android") return;

    const showCardLimit =
      settings.cardLimitEnabled && settings.cardLimitProvider && settings.cardLimitAmount > 0;

    if (!settings.stickyNotificationEnabled || !showCardLimit) {
      try {
        await BudgetPlugin.hideStickyNotification();
      } catch (error) {
        console.error("고정 알림 제거 실패:", error);
      }
      return;
    }

    if (!db) return;

    const records = await getAll("records");
    const cardAdjustment =
      settings.cardLimitAdjustmentMonth === getCurrentYm() ? settings.cardLimitAdjustment : 0;
    const hasAccumulated =
      !!settings.cardLimitProvider &&
      settings.cardLimitAccumulatedProvider === settings.cardLimitProvider &&
      settings.cardLimitAccumulatedYm === getCurrentYm();
    const cardUsedRaw = computeCardUsage(records, settings.cardLimitProvider);
    const cardUsed = hasAccumulated
      ? Math.max(0, settings.cardLimitAccumulated)
      : Math.max(0, cardUsedRaw + cardAdjustment);
    const cardRemaining = settings.cardLimitAmount - cardUsed;

    try {
      await BudgetPlugin.showStickyNotification({
        text: `현재 남은 한도 : ${formatNumber(Math.round(cardRemaining))} 원`,
      });
    } catch (error) {
      console.error("고정 알림 표시 실패:", error);
    }
  }, [db, getAll, settings]);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    window.addEventListener("budget-db-updated", sync);
    return () => window.removeEventListener("budget-db-updated", sync);
  }, [sync]);
}
