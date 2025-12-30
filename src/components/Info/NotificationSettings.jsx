import React, { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app"; // 앱 상태 감지를 위해 추가
import { BudgetPlugin } from "../../plugins/BudgetPlugin";
import * as S from "../../../src/pages/Settings/SettingsPage.styles";

export default function NotificationSettings() {
  const [hasNotiAccess, setHasNotiAccess] = useState(false);
  const [autoSaveIncome, setAutoSaveIncome] = useState(true);
  const [autoSaveExpense, setAutoSaveExpense] = useState(true);

  // 권한 체크 로직을 useCallback으로 공통화
  const checkAccess = useCallback(async () => {
    if (Capacitor.getPlatform() === "android") {
      try {
        const result = await BudgetPlugin.hasNotificationAccess();
        setHasNotiAccess(!!result.granted);
      } catch (error) {
        console.error("권한 체크 실패:", error);
      }
    }
  }, []);

  useEffect(() => {
    // 1. 초기 로컬 스토리지 값 및 권한 로드
    setAutoSaveIncome(localStorage.getItem("autoSaveIncome") !== "false");
    setAutoSaveExpense(localStorage.getItem("autoSaveExpense") !== "false");
    checkAccess();

    // 2. 앱 상태 변화 감지 리스너 등록 (핵심)
    // 사용자가 설정창에 갔다가 앱으로 돌아오는 순간(isActive: true) 체크를 다시 수행합니다.
    const nativeListener = App.addListener("appStateChange", ({ isActive }) => {
      if (isActive) {
        checkAccess();
      }
    });

    // 3. 언마운트 시 리스너 해제
    return () => {
      nativeListener.remove();
    };
  }, [checkAccess]);

  // 설정 앱으로 이동
  const openNotificationAccess = async () => {
    if (Capacitor.getPlatform() !== "android") return;
    await BudgetPlugin.openNotificationAccessSettings();
    // 여기서 바로 checkAccess()를 호출할 필요가 없습니다. 
    // 리스너가 돌아오는 시점을 감지하기 때문입니다.
  };

  // 토글 처리
  const toggleAutoSave = (key, currentVal, setter) => {
    const newVal = !currentVal;
    localStorage.setItem(key, String(newVal));
    setter(newVal);
  };

  return (
    <>
      <S.SectionTitle>자동 기록 설정</S.SectionTitle>

      <S.Btn onClick={openNotificationAccess}>
        알림 접근 권한 설정
      </S.Btn>

      {/* 권한 상태에 따라 스타일 및 비활성화 처리 */}
      <S.ToggleRow style={{ opacity: hasNotiAccess ? 1 : 0.5, transition: "opacity 0.3s" }}>
        <span>입금 자동 저장</span>
        <S.ToggleSwitch>
          <input
            type="checkbox"
            disabled={!hasNotiAccess}
            checked={autoSaveIncome}
            onChange={() =>
              toggleAutoSave("autoSaveIncome", autoSaveIncome, setAutoSaveIncome)
            }
          />
          <span></span>
        </S.ToggleSwitch>
      </S.ToggleRow>

      <S.ToggleRow style={{ opacity: hasNotiAccess ? 1 : 0.5, transition: "opacity 0.3s" }}>
        <span>지출 자동 저장</span>
        <S.ToggleSwitch>
          <input
            type="checkbox"
            disabled={!hasNotiAccess}
            checked={autoSaveExpense}
            onChange={() =>
              toggleAutoSave("autoSaveExpense", autoSaveExpense, setAutoSaveExpense)
            }
          />
          <span></span>
        </S.ToggleSwitch>
      </S.ToggleRow>

      {!hasNotiAccess && (
        <p style={{ color: "#d9534f", fontSize: "12px", marginBottom: "10px", fontWeight: "bold" }}>
          * 알림 접근 권한이 꺼져 있어 자동 저장을 사용할 수 없습니다.
        </p>
      )}
    </>
  );
}