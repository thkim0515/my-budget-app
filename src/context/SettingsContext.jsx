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
    
    // 자동 기록(알림) 관련
    autoSaveIncome: localStorage.getItem("autoSaveIncome") !== "false",
    autoSaveExpense: localStorage.getItem("autoSaveExpense") !== "false",
    
    // 상세 페이지 모아보기 관련 [추가됨]
    isIncomeGrouped: localStorage.getItem("isIncomeGrouped") === "true",
    isExpenseGrouped: localStorage.getItem("isExpenseGrouped") === "true",
  });

  // 2. 설정이 변경될 때마다 localStorage에 즉시 반영
  useEffect(() => {
    localStorage.setItem("themeMode", settings.mode);
    localStorage.setItem("lightTextColor", settings.lightTextColor);
    localStorage.setItem("darkTextColor", settings.darkTextColor);
    localStorage.setItem("currencyUnit", settings.currencyUnit);
    localStorage.setItem("useBiometric", String(settings.useBiometric));
    localStorage.setItem("autoSaveIncome", String(settings.autoSaveIncome));
    localStorage.setItem("autoSaveExpense", String(settings.autoSaveExpense));
    localStorage.setItem("isIncomeGrouped", String(settings.isIncomeGrouped));
    localStorage.setItem("isExpenseGrouped", String(settings.isExpenseGrouped));
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