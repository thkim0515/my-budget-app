import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { useTheme } from "styled-components";
import { Capacitor } from "@capacitor/core";
import { useSettings } from "../../context/SettingsContext";
import { getKnownSources } from "../../utils/notiParser";
import { formatNumber } from "../../utils/numberFormat";
import { BudgetPlugin } from "../../plugins/BudgetPlugin";
import * as S from "../../pages/Settings/SettingsPage.styles";

export default function CardLimitSettings() {
  const theme = useTheme();
  const { settings, updateSetting } = useSettings();
  const sources = getKnownSources();
  const [pickerOpen, setPickerOpen] = useState(false);

  // 입력 중에는 임시값(draft)만 바꾸고, "저장" 버튼을 눌러야 실제 설정에 반영한다.
  const [amountDraft, setAmountDraft] = useState(
    settings.cardLimitAmount ? String(settings.cardLimitAmount) : ""
  );

  // 다른 화면/기기에서 값이 바뀌어 settings가 갱신되면 임시값도 함께 맞춘다.
  useEffect(() => {
    setAmountDraft(settings.cardLimitAmount ? String(settings.cardLimitAmount) : "");
  }, [settings.cardLimitAmount]);

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    setAmountDraft(raw);
  };

  const draftAmount = amountDraft ? Number(amountDraft) : 0;
  const isAmountDirty = draftAmount !== (settings.cardLimitAmount || 0);

  const saveAmount = () => {
    if (!isAmountDirty) return;
    if (!window.confirm(`카드 한도를 ${formatNumber(draftAmount)}원으로 저장하시겠습니까?`)) return;
    updateSetting("cardLimitAmount", draftAmount);
    alert("한도가 저장되었습니다.");
  };

  const selectProvider = (s) => {
    updateSetting("cardLimitProvider", s);
    setPickerOpen(false);
  };

  // 토글을 끄면 상태바 알림을 즉시 제거한다(다시 생기지 않음).
  const toggleStickyNotification = () => {
    const next = !settings.stickyNotificationEnabled;
    updateSetting("stickyNotificationEnabled", next);
    if (!next && Capacitor.getPlatform() === "android") {
      BudgetPlugin.hideStickyNotification().catch((error) =>
        console.error("고정 알림 제거 실패:", error)
      );
    }
  };

  return (
    <>
      <S.SectionTitle>카드 한도 표시</S.SectionTitle>

      <S.ToggleRow>
        <span>홈 화면에 카드 한도 표시</span>
        <S.ToggleSwitch>
          <input
            type="checkbox"
            checked={settings.cardLimitEnabled}
            onChange={() => updateSetting("cardLimitEnabled", !settings.cardLimitEnabled)}
          />
          <span></span>
        </S.ToggleSwitch>
      </S.ToggleRow>

      {settings.cardLimitEnabled && (
        <>
          <S.FieldLabelStandalone>사용 카드사</S.FieldLabelStandalone>
          <S.SelectInline
            as="button"
            type="button"
            onClick={() => setPickerOpen(true)}
            style={{ textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span>{settings.cardLimitProvider || "카드사를 선택하세요"}</span>
            <span style={{ opacity: 0.6 }}>▾</span>
          </S.SelectInline>

          {pickerOpen &&
            ReactDOM.createPortal(
              <div
                onClick={() => setPickerOpen(false)}
                style={{
                  position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
                  display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300,
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: "100%", maxWidth: 480,
                    maxHeight: "50vh",
                    display: "flex", flexDirection: "column",
                    background: theme.card, border: `1px solid ${theme.border}`,
                    borderTopLeftRadius: 16, borderTopRightRadius: 16,
                    boxSizing: "border-box", overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "14px 16px", fontWeight: 700, color: theme.text, borderBottom: `1px solid ${theme.border}` }}>
                    카드사 선택
                  </div>
                  <div style={{ overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
                    {sources.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => selectProvider(s)}
                        style={{
                          display: "block", width: "100%", padding: "14px 16px",
                          background: settings.cardLimitProvider === s ? theme.activeBg : "transparent",
                          border: "none", borderBottom: `1px solid ${theme.border}`,
                          textAlign: "left", fontSize: 15,
                          fontWeight: settings.cardLimitProvider === s ? 700 : 400,
                          color: theme.text, cursor: "pointer",
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>,
              document.body,
            )}

          <S.FieldLabelStandalone>한도 (원)</S.FieldLabelStandalone>
          <S.InputInline
            inputMode="numeric"
            placeholder="예: 2000000"
            value={amountDraft ? formatNumber(amountDraft) : ""}
            onChange={handleAmountChange}
          />

          <S.PrimarySaveBtn type="button" onClick={saveAmount} disabled={!isAmountDirty}>
            저장
          </S.PrimarySaveBtn>

          {settings.cardLimitProvider && settings.cardLimitAmount > 0 && (
            <>
              <S.ToggleRow>
                <span>상태바에 남은 한도 고정 알림 표시</span>
                <S.ToggleSwitch>
                  <input
                    type="checkbox"
                    checked={settings.stickyNotificationEnabled}
                    onChange={toggleStickyNotification}
                  />
                  <span></span>
                </S.ToggleSwitch>
              </S.ToggleRow>
              {settings.stickyNotificationEnabled && (
                <p style={{ fontSize: "12px", color: theme.subText, marginTop: "-4px", marginBottom: "10px" }}>
                  * 켜져 있는 동안은 알림을 지워도 남은 한도가 다시 표시됩니다. 끄면 완전히 사라집니다.
                </p>
              )}
            </>
          )}

          {!settings.cardLimitProvider && (
            <p style={{ fontSize: "12px", color: "#F5455C", marginTop: "-4px", marginBottom: "10px" }}>
              * 카드사를 선택해야 홈 화면에 표시됩니다.
            </p>
          )}
          {settings.cardLimitProvider && !settings.cardLimitAmount && (
            <p style={{ fontSize: "12px", color: "#F5455C", marginTop: "-4px", marginBottom: "10px" }}>
              * 한도 금액을 입력해야 홈 화면에 표시됩니다.
            </p>
          )}
        </>
      )}
    </>
  );
}
