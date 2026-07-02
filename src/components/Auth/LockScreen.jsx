import React, { useState } from "react";
import { ThemeProvider } from "styled-components";
import { getLightTheme, getDarkTheme } from "../../theme";
import { useSettings } from "../../context/SettingsContext";

const PIN_LENGTH = 4;

function PinPad({ onVerifyPin, onBack, theme }) {
  const [digits, setDigits] = useState([]);
  const [error, setError] = useState(false);

  const handleDigit = (d) => {
    if (digits.length >= PIN_LENGTH) return;
    const next = [...digits, d];
    setDigits(next);
    setError(false);

    if (next.length === PIN_LENGTH) {
      const ok = onVerifyPin(next.join(""));
      if (!ok) {
        setTimeout(() => {
          setDigits([]);
          setError(true);
        }, 300);
      }
    }
  };

  const handleDelete = () => {
    setDigits((prev) => prev.slice(0, -1));
    setError(false);
  };

  const btnStyle = {
    width: 64,
    height: 64,
    borderRadius: "50%",
    border: `1px solid ${theme.border}`,
    background: theme.activeBg,
    color: theme.text,
    fontSize: 22,
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
      <p style={{ margin: 0, fontSize: 16, color: theme.text, opacity: 0.8 }}>PIN 번호를 입력하세요</p>

      <div style={{ display: "flex", gap: 16 }}>
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              background: i < digits.length ? (error ? theme.errorText : theme.activeText) : "transparent",
              border: `2px solid ${error ? theme.errorText : theme.activeText}`,
              transition: "background 0.15s",
            }}
          />
        ))}
      </div>

      {error && <p style={{ margin: 0, color: theme.errorText, fontSize: 13, fontWeight: 600 }}>PIN 번호가 틀렸습니다</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 64px)", gap: 12 }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} onClick={() => handleDigit(String(n))} style={btnStyle}>
            {n}
          </button>
        ))}
        <div />
        <button onClick={() => handleDigit("0")} style={btnStyle}>0</button>
        <button
          onClick={handleDelete}
          style={{ ...btnStyle, background: "transparent", color: theme.mutedText, fontSize: 20 }}
        >
          ⌫
        </button>
      </div>

      {onBack && (
        <button
          onClick={onBack}
          style={{ marginTop: 8, background: "none", border: "none", color: theme.activeText, fontSize: 14, cursor: "pointer" }}
        >
          지문 인식으로 다시 시도
        </button>
      )}
    </div>
  );
}

export default function LockScreen({ onAuthenticate, needsPinFallback, onVerifyPin }) {
  const { settings } = useSettings();
  const [forcePinMode, setForcePinMode] = useState(false);

  const theme =
    settings.mode === "light"
      ? getLightTheme(settings.lightTextColor)
      : getDarkTheme(settings.darkTextColor);

  const showPin = needsPinFallback || forcePinMode;

  return (
    <ThemeProvider theme={theme}>
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: theme.bg,
          color: theme.text,
          padding: "20px",
          transition: "background 0.3s ease, color 0.3s ease",
        }}
      >
        <h2 style={{ marginBottom: 10, color: theme.text }}>잠금 상태</h2>

        {showPin ? (
          <PinPad
            theme={theme}
            onVerifyPin={onVerifyPin}
            onBack={needsPinFallback ? onAuthenticate : () => setForcePinMode(false)}
          />
        ) : (
          <>
            <p style={{ marginBottom: 30, opacity: 0.8, color: theme.text }}>
              앱을 사용하려면 인증이 필요합니다.
            </p>
            <button
              onClick={onAuthenticate}
              style={{
                padding: "14px 32px",
                background: theme.primary,
                color: "#fff",
                border: "none",
                borderRadius: "14px",
                fontSize: "16px",
                fontWeight: "bold",
                cursor: "pointer",
                boxShadow: theme.shadowPrimary,
              }}
            >
              지문 인증하기
            </button>
            {settings.lockPin && (
              <button
                onClick={() => setForcePinMode(true)}
                style={{
                  marginTop: 16,
                  background: "none",
                  border: "none",
                  color: theme.activeText,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                PIN 번호로 잠금 해제
              </button>
            )}
          </>
        )}
      </div>
    </ThemeProvider>
  );
}
