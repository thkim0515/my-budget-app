import React, { useState } from "react";
import ReactDOM from "react-dom";
import { useTheme } from "styled-components";
import { useSettings } from "../../context/SettingsContext";
import { getKnownSources } from "../../utils/notiParser";
import { formatNumber } from "../../utils/numberFormat";
import * as S from "../../pages/Settings/SettingsPage.styles";

export default function CardLimitSettings() {
  const theme = useTheme();
  const { settings, updateSetting } = useSettings();
  const sources = getKnownSources();
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleAmountChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    updateSetting("cardLimitAmount", raw ? Number(raw) : 0);
  };

  const selectProvider = (s) => {
    updateSetting("cardLimitProvider", s);
    setPickerOpen(false);
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
            value={settings.cardLimitAmount ? formatNumber(settings.cardLimitAmount) : ""}
            onChange={handleAmountChange}
          />

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
