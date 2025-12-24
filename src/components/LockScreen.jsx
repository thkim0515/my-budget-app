import { ThemeProvider } from "styled-components";
import { lightTheme, darkTheme } from "../theme";

export default function LockScreen({ mode, onAuthenticate }) {
  const theme = mode === "light" ? lightTheme : darkTheme;

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
