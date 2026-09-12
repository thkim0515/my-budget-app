import React, { useEffect, useState, useCallback } from "react";
import { useTheme } from "styled-components";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { BudgetPlugin } from "../../plugins/BudgetPlugin";
import { useSettings } from "../../context/SettingsContext";
import { parseAndCreateRecord } from "../../utils/notiParser";
import * as S from "../../../src/pages/Settings/SettingsPage.styles";

const DEBUG_UNLOCK_KEY = "notiDebugUnlockUntil";
const isDebugUnlocked = () => Date.now() < Number(localStorage.getItem(DEBUG_UNLOCK_KEY) || 0);

export default function NotificationSettings() {
  const theme = useTheme();
  const { settings, updateSetting } = useSettings();
  const [hasNotiAccess, setHasNotiAccess] = useState(false);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugItems, setDebugItems] = useState(null);
  const [debugUnlocked, setDebugUnlocked] = useState(isDebugUnlocked());

  // 개인정보처리방침 페이지의 숨겨진 트리거로 30분간 열린 디버그 메뉴.
  // 시간이 지나면 화면을 벗어나지 않아도 자동으로 다시 숨겨지도록 주기적으로 확인한다.
  useEffect(() => {
    const timer = setInterval(() => setDebugUnlocked(isDebugUnlocked()), 30000);
    return () => clearInterval(timer);
  }, []);

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
        <p style={{ color: theme.errorText, fontSize: "12px", marginBottom: "10px", fontWeight: "bold" }}>
          * 알림 접근 권한이 꺼져 있어 자동 저장을 사용할 수 없습니다.
        </p>
      )}

      {debugUnlocked && (
      <S.Btn
        onClick={() => {
          if (!debugOpen) {
            try {
              setDebugItems(JSON.parse(localStorage.getItem("notiDebugLog") || "[]"));
            } catch {
              setDebugItems([]);
            }
          }
          setDebugOpen((v) => !v);
        }}
      >
        {debugOpen ? "최근 캡처된 알림 원문 닫기" : "최근 캡처된 알림 원문 보기 (디버그)"}
      </S.Btn>
      )}

      {debugUnlocked && debugOpen && (
        <div style={{ marginBottom: "10px" }}>
          {(!debugItems || debugItems.length === 0) && (
            <p style={{ fontSize: "12px", color: theme.subText }}>
              아직 캡처된 알림이 없습니다. 카드 결제 알림을 받은 뒤 앱을 열고 다시 확인해보세요.
            </p>
          )}
          {debugItems && debugItems.map((item, idx) => {
            const parsed = parseAndCreateRecord(`${item.title} ${item.text}`);
            return (
              <div
                key={idx}
                style={{
                  padding: "10px",
                  marginBottom: "8px",
                  border: `1px solid ${theme.border}`,
                  borderRadius: "8px",
                  background: theme.card,
                  fontSize: "12px",
                  wordBreak: "break-all",
                }}
              >
                <div style={{ color: theme.subText, marginBottom: "4px" }}>
                  {item.time ? new Date(item.time).toLocaleString("ko-KR") : ""}
                </div>
                <div style={{ marginBottom: "6px" }}>
                  <strong>{item.title}</strong> {item.text}
                </div>
                {parsed ? (
                  <div style={{ color: theme.primary || "#2ecc71", fontWeight: "bold" }}>
                    ✅ 파싱 성공: {parsed.type === "income" ? "입금" : "지출"} {parsed.amount.toLocaleString()}원 ({parsed.title})
                  </div>
                ) : (
                  <div style={{ color: theme.errorText, fontWeight: "bold" }}>
                    ❌ 파싱 실패 (금액 인식 실패 또는 광고/무시 키워드로 판단됨)
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}