import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { BudgetPlugin } from "../plugins/BudgetPlugin";
import { useBudgetDB } from "./useBudgetDB";
import { isTidyEnabled, runDailyTidy, tidyLocal } from "../utils/spendClassify";

// 앱을 켜거나 돌아올 때 분류를 정리한다. 앱 안 비교는 항상, Claude 는 설정을 켠 경우 하루 한 번.
export function useDailyTidy() {
  const { db, getAll, put } = useBudgetDB();
  const running = useRef(false);

  useEffect(() => {
    if (!db) return undefined;
    const run = async () => {
      if (running.current || document.visibilityState !== "visible") return;
      running.current = true;
      try {
        const helpers = { getAll, put };
        let result = null;
        if (Capacitor.isNativePlatform() && isTidyEnabled()) {
          const { exists } = await BudgetPlugin.hasClaudeApiKey();
          result = exists ? await runDailyTidy(helpers) : await tidyLocal(helpers);
        } else {
          result = await tidyLocal(helpers);
        }
        if (result && (result > 0 || result.applied > 0 || result.suggested > 0)) window.dispatchEvent(new CustomEvent("budget-db-updated"));
      } catch (e) {
        console.warn("분류 정리 실패:", e?.message);
      } finally {
        running.current = false;
      }
    };
    run();
    document.addEventListener("visibilitychange", run);
    return () => document.removeEventListener("visibilitychange", run);
  }, [db, getAll, put]);
}
