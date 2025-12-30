import React from "react";
import { ThemeProvider } from "styled-components";
import { getLightTheme, getDarkTheme } from "../../theme";
import { useSettings } from "../../context/SettingsContext"; // Context 훅 임포트

/**
 * 잠금 화면 컴포넌트
 */
export default function LockScreen({ onAuthenticate }) {
  // 중앙 설정 본부에서 현재 테마 모드와 텍스트 색상 설정을 가져옵니다.
  const { settings } = useSettings();

  // Context의 설정을 바탕으로 테마 객체 생성
  const theme = settings.mode === "light" 
    ? getLightTheme(settings.lightTextColor) 
    : getDarkTheme(settings.darkTextColor);

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
          color: theme.text, // 설정된 색상이 적용된 테마의 텍스트 컬러 사용
          padding: "20px",
          transition: "background 0.3s ease, color 0.3s ease", // 테마 변경 시 부드러운 전환
        }}
      >
        <h2 style={{ marginBottom: "10px" }}>잠금 상태</h2>
        <p style={{ marginBottom: "30px", opacity: 0.8 }}>
          앱을 사용하려면 인증이 필요합니다.
        </p>

        <button
          onClick={onAuthenticate}
          style={{
            padding: "14px 28px",
            background: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          인증하기
        </button>
      </div>
    </ThemeProvider>
  );
}