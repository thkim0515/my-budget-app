import React, { createContext, useContext, useState, useEffect } from "react";

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
  // 1. 모든 설정 항목의 초기 상태를 통합 관리 (localStorage 동기화)
  const [settings, setSettings] = useState({
    // 테마 관련
    mode: localStorage.getItem("themeMode") || "light",
    lightTextColor: localStorage.getItem("lightTextColor") || "#222222",
    darkTextColor: localStorage.getItem("darkTextColor") || "#e5e5e5",
    
    // 앱 기능 관련
    currencyUnit: localStorage.getItem("currencyUnit") || "원",
    useBiometric: localStorage.getItem("useBiometric") === "true",
    lockPin: localStorage.getItem("lockPin") || "",
    
    // 자동 기록(알림) 관련
    autoSaveIncome: localStorage.getItem("autoSaveIncome") !== "false",
    autoSaveExpense: localStorage.getItem("autoSaveExpense") !== "false",
    
    // 상세 페이지 모아보기 관련 [추가됨]
    isIncomeGrouped: localStorage.getItem("isIncomeGrouped") === "true",
    isExpenseGrouped: localStorage.getItem("isExpenseGrouped") === "true",

    // 카드 한도 표시 관련
    cardLimitEnabled: localStorage.getItem("cardLimitEnabled") === "true",
    cardLimitProvider: localStorage.getItem("cardLimitProvider") || "",
    cardLimitAmount: Number(localStorage.getItem("cardLimitAmount")) || 0,
    // 자동 계산된 이번 달 사용액에 더해지는 수동 보정값(원). 리셋/직접 수정 시 갱신된다.
    cardLimitAdjustment: Number(localStorage.getItem("cardLimitAdjustment")) || 0,
    // 위 보정값이 적용되는 달("YYYY-MM"). 달이 바뀌면 보정값은 자동으로 무시된다.
    cardLimitAdjustmentMonth: localStorage.getItem("cardLimitAdjustmentMonth") || "",

    // 카드 승인 문자의 "누적OOO원"에서 직접 읽어온 당월 누적 사용액.
    // 지출 자동저장 설정과 무관하게 알림이 오는 즉시 항상 갱신된다.
    cardLimitAccumulated: Number(localStorage.getItem("cardLimitAccumulated")) || 0,
    // 위 누적값이 어느 카드사 문자에서 온 것인지("cardLimitProvider"와 일치해야 유효).
    cardLimitAccumulatedProvider: localStorage.getItem("cardLimitAccumulatedProvider") || "",
    // 위 누적값이 갱신된 달("YYYY-MM"). 달이 바뀌면 새 알림이 오기 전까지 무효 처리된다.
    cardLimitAccumulatedYm: localStorage.getItem("cardLimitAccumulatedYm") || "",
  });

  // 2. 설정이 변경될 때마다 localStorage에 즉시 반영
  useEffect(() => {
    localStorage.setItem("themeMode", settings.mode);
    localStorage.setItem("lightTextColor", settings.lightTextColor);
    localStorage.setItem("darkTextColor", settings.darkTextColor);
    localStorage.setItem("currencyUnit", settings.currencyUnit);
    localStorage.setItem("useBiometric", String(settings.useBiometric));
    localStorage.setItem("lockPin", settings.lockPin);
    localStorage.setItem("autoSaveIncome", String(settings.autoSaveIncome));
    localStorage.setItem("autoSaveExpense", String(settings.autoSaveExpense));
    localStorage.setItem("isIncomeGrouped", String(settings.isIncomeGrouped));
    localStorage.setItem("isExpenseGrouped", String(settings.isExpenseGrouped));
    localStorage.setItem("cardLimitEnabled", String(settings.cardLimitEnabled));
    localStorage.setItem("cardLimitProvider", settings.cardLimitProvider);
    localStorage.setItem("cardLimitAmount", String(settings.cardLimitAmount));
    localStorage.setItem("cardLimitAdjustment", String(settings.cardLimitAdjustment));
    localStorage.setItem("cardLimitAdjustmentMonth", settings.cardLimitAdjustmentMonth);
    localStorage.setItem("cardLimitAccumulated", String(settings.cardLimitAccumulated));
    localStorage.setItem("cardLimitAccumulatedProvider", settings.cardLimitAccumulatedProvider);
    localStorage.setItem("cardLimitAccumulatedYm", settings.cardLimitAccumulatedYm);
  }, [settings]);

  // 3. 설정 업데이트 함수 (key: 항목명, value: 변경할 값)
  const updateSetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSetting }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};