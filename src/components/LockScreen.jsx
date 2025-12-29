// src/components/LockScreen.jsx
import { ThemeProvider } from "styled-components";
import { getLightTheme, getDarkTheme } from "../theme"; // 🔥 수정됨

export default function LockScreen({ mode, onAuthenticate }) {
  // 사용자가 설정한 색상을 반영하기 위해 localStorage 확인
  const lightColor = localStorage.getItem("lightTextColor") || "#222222";
  const darkColor = localStorage.getItem("darkTextColor") || "#e5e5e5";

  // 함수를 호출하여 테마 객체 생성
  const theme = mode === "light" ? getLightTheme(lightColor) : getDarkTheme(darkColor);

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
          color: theme.text, // 이제 설정한 색상이 적용됩니다.
          padding: "20px",
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