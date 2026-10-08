import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { useTheme } from "styled-components";
import { Capacitor } from "@capacitor/core";
import { useSettings } from "../../context/SettingsContext";
import { getKnownSources } from "../../utils/notiParser";
import { getCurrentYm } from "../../utils/cardLimit";
import { formatNumber, unformatNumber } from "../../utils/numberFormat";
import { BudgetPlugin } from "../../plugins/BudgetPlugin";
import { useFormattedNumberInput } from "../../hooks/useFormattedNumberInput";
import * as S from "../../pages/Settings/SettingsPage.styles";

// 카드 한도 설정 입력 모음 — 홈의 한도 바텀시트(CardLimitSheet)와 설정 화면(CardLimitSettings)이 함께 쓴다.
//   - 사용 카드사 선택 / 한도 금액 입력·저장 / 상태바 고정 알림 토글
//   - usage 를 넘기면(홈에서 열 때) "현재 남은 한도" 표시와 한도 리셋·남은 한도 직접 입력도 보여 준다.
//       usage = { remaining, usedRaw, hasAccumulated, unit }
//   - onDone: 저장·적용·리셋이 끝났을 때 호출(시트를 닫는 데 사용)
export default function CardLimitPanel({ usage = null, onDone }) {
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

  // 콤마 포맷을 유지하면서 커서 위치를 보존한다(중간 숫자를 지워도 커서가 끝으로 튀지 않음).
  const amountInput = useFormattedNumberInput({ onChange: (f) => setAmountDraft(f.replace(/,/g, "")) });

  // 남은 한도 직접 입력(홈에서 열 때만 사용)
  const [manualInput, setManualInput] = useState(() =>
    usage ? (usage.remaining > 0 ? String(Math.round(usage.remaining)) : "0") : ""
  );
  const manualLimitInput = useFormattedNumberInput({ onChange: (f) => setManualInput(f.replace(/,/g, "")) });

  const draftAmount = amountDraft ? Number(amountDraft) : 0;
  const isAmountDirty = draftAmount !== (settings.cardLimitAmount || 0);

  const saveAmount = () => {
    if (!isAmountDirty) return;
    if (!window.confirm(`카드 한도를 ${formatNumber(draftAmount)}원으로 저장하시겠습니까?`)) return;
    updateSetting("cardLimitAmount", draftAmount);
    // 카드사와 한도가 모두 정해지면 홈 화면에 표시되도록 켠다(별도 토글은 없다).
    if (settings.cardLimitProvider && draftAmount > 0) updateSetting("cardLimitEnabled", true);
    alert("한도가 저장되었습니다.");
    onDone?.();
  };

  const selectProvider = (s) => {
    updateSetting("cardLimitProvider", s);
    if (settings.cardLimitAmount > 0) updateSetting("cardLimitEnabled", true);
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

  // 한도 리셋: 이번 달 사용액을 0으로 되돌린다.
  // - 문자 기반 누적값을 쓰는 중이면 누적값 자체를 0으로.
  // - 아니면 기존 방식대로 보정값으로 상쇄(실제 자동 계산치는 그대로 둠).
  const resetUsage = () => {
    if (usage.hasAccumulated) {
      updateSetting("cardLimitAccumulated", 0);
    } else {
      updateSetting("cardLimitAdjustment", -usage.usedRaw);
      updateSetting("cardLimitAdjustmentMonth", getCurrentYm());
    }
    onDone?.();
  };

  // 남은 한도를 사용자가 직접 입력한 값으로 맞춘다.
  const applyManualRemaining = () => {
    const desiredUsed = settings.cardLimitAmount - unformatNumber(manualInput);
    if (usage.hasAccumulated) {
      updateSetting("cardLimitAccumulated", Math.max(0, desiredUsed));
    } else {
      updateSetting("cardLimitAdjustment", desiredUsed - usage.usedRaw);
      updateSetting("cardLimitAdjustmentMonth", getCurrentYm());
    }
    onDone?.();
  };

  const configured = !!settings.cardLimitProvider && settings.cardLimitAmount > 0;

  return (
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
              display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 310,
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
                paddingBottom: "env(safe-area-inset-bottom)",
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
        onChange={amountInput.onChange}
      />

      <S.PrimarySaveBtn type="button" onClick={saveAmount} disabled={!isAmountDirty}>
        저장
      </S.PrimarySaveBtn>

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

      {usage && configured && (
        <>
          <S.FieldLabelStandalone>
            남은 한도 직접 입력 ({usage.unit}) — 현재 {formatNumber(usage.remaining)} {usage.unit} 남음
          </S.FieldLabelStandalone>
          <S.InputInline
            inputMode="numeric"
            placeholder="예: 1900000"
            value={manualInput === "" ? "" : formatNumber(manualInput)}
            onChange={manualLimitInput.onChange}
          />
          <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
            <S.PrimarySaveBtn type="button" style={{ flex: 1, marginTop: 0 }} onClick={applyManualRemaining}>
              적용
            </S.PrimarySaveBtn>
            <S.PrimarySaveBtn
              type="button"
              style={{ flex: 1, marginTop: 0, background: "#6F5BFF" }}
              onClick={resetUsage}
            >
              한도 리셋
            </S.PrimarySaveBtn>
          </div>
          <p style={{ fontSize: "12px", color: theme.subText, margin: "0 0 4px" }}>
            * 한도 리셋은 이번 달 사용액을 0으로 되돌립니다.
          </p>
        </>
      )}

      {configured && (
        <>
          <S.ToggleRow style={{ marginTop: 16 }}>
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
    </>
  );
}
