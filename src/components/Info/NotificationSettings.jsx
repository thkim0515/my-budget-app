import React, { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app"; 
import { BudgetPlugin } from "../../plugins/BudgetPlugin";
import { useSettings } from "../../context/SettingsContext"; // [추가] Context 훅 임포트
import * as S from "../../../src/pages/Settings/SettingsPage.styles";

export default function NotificationSettings() {
  const { settings, updateSetting } = useSettings(); // [추가] 중앙 설정 가져오기
  const [hasNotiAccess, setHasNotiAccess] = useState(false);

  // 권한 체크 로직 (기능 유지)
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
    // [수정] 초기 로컬 스토리지 로드 로직은 SettingsContext가 처리하므로 checkAccess만 실행
    checkAccess();

    let handler;

    const setupListener = async () => {
      handler = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) {
          checkAccess();
        }
      });
    };

    setupListener();

    return () => {
      if (handler) {
        handler.remove();
      }
    };
  }, [checkAccess]);

  // 설정 앱으로 이동 (기능 유지)
  const openNotificationAccess = async () => {
    if (Capacitor.getPlatform() !== "android") return;
    await BudgetPlugin.openNotificationAccessSettings();
  };

  // [수정] 토글 처리: 이제 로컬 state가 아닌 updateSetting을 사용합니다.
  const toggleAutoSave = (key, currentVal) => {
    updateSetting(key, !currentVal);
  };

  return (
    <>
      <S.SectionTitle>자동 기록 설정</S.SectionTitle>

      <S.Btn onClick={openNotificationAccess}>
        알림 접근 권한 설정
      </S.Btn>

      {/* [수정] value 참조를 settings 객체로 변경 */}
      <S.ToggleRow style={{ opacity: hasNotiAccess ? 1 : 0.5, transition: "opacity 0.3s" }}>
        <span>입금 자동 저장</span>
        <S.ToggleSwitch>
          <input
            type="checkbox"
            disabled={!hasNotiAccess}
            checked={settings.autoSaveIncome}
            onChange={() =>
              toggleAutoSave("autoSaveIncome", settings.autoSaveIncome)
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
            checked={settings.autoSaveExpense}
            onChange={() =>
              toggleAutoSave("autoSaveExpense", settings.autoSaveExpense)
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