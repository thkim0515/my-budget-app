import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { lightTheme, darkTheme } from "./theme";
import { useState, useEffect, useRef } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";

import MainPage from "./pages/MainPage";
import DetailPage from "./pages/DetailPage";
import SettingsPage from "./pages/SettingsPage";
import StatsPage from "./pages/StatsPage";
import BottomTabBar from "./components/BottomTabBar";
import CurrencySettingsPage from "./pages/CurrencySettingsPage";
import StatsBySourcePage from "./pages/StatsBySourcePage";
import CategorySettingsPage from "./pages/CategorySettingsPage";
import CalendarStatsPage from "./pages/CalendarStatsPage";

const getInitialMode = () => {
  const savedMode = localStorage.getItem("themeMode");
  return savedMode || "light";
};

const isNative = () => !!window.Capacitor?.isNativePlatform?.();

export default function App() {
  const [mode, setMode] = useState(getInitialMode);

  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // 인증 직후 발생하는 appStateChange 를 무시하기 위한 타임스탬프
  const lastAuthTime = useRef(0);

  useEffect(() => {
    localStorage.setItem("themeMode", mode);
  }, [mode]);

  // 뒤로가기 핸들러
  useEffect(() => {
    if (!isNative()) return;
    let handler;

    const setup = async () => {
      handler = await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) window.history.back();
      });
    };

    setup();
    return () => handler?.remove?.();
  }, []);

  // 생체 인증 실행
  const performBiometricAuth = async () => {
    if (!isNative()) {
      setIsLocked(false);
      return;
    }

    if (isAuthenticating) return;

    setIsAuthenticating(true);

    try {
      const available = await NativeBiometric.isAvailable();

      if (!available.isAvailable) {
        setIsLocked(false);
        setIsAuthenticating(false);
        return;
      }

      await NativeBiometric.verifyIdentity({
        reason: "앱 잠금 해제",
        title: "가계부 잠금 해제",
        subtitle: "지문 또는 얼굴 인증",
        description: "인증 후 앱을 사용할 수 있습니다.",
      });

      // 인증 성공 → 잠금 해제
      setIsLocked(false);
      lastAuthTime.current = Date.now();
    } catch {
      setIsLocked(true);
    }

    setIsAuthenticating(false);
  };

  // 앱 상태 변화(백그라운드 → 포그라운드)
  useEffect(() => {
    if (!isNative()) return;

    const listener = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      const useBiometric = localStorage.getItem("useBiometric") === "true";

      // 인증 직후 1초간 appStateChange 무시
      if (Date.now() - lastAuthTime.current < 1000) return;

      // 잠겨 있고 biometric 활성화된 상태에서만 인증
      if (isActive && useBiometric && isLocked && !isAuthenticating) {
        performBiometricAuth();
      }
    });

    return () => listener?.remove?.();
  }, [isLocked, isAuthenticating]);

  // 앱 초기 잠금 검사
  useEffect(() => {
    const useBiometric = localStorage.getItem("useBiometric") === "true";

    if (isNative() && useBiometric) {
      setIsLocked(true);
      performBiometricAuth();
    } else {
      setIsLocked(false);
    }

    setIsChecking(false);
  }, []);

  if (isChecking) return null;

  if (isLocked) {
    return (
      <ThemeProvider theme={mode === "light" ? lightTheme : darkTheme}>
        <div
          style={{
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            background: mode === "light" ? lightTheme.bg : darkTheme.bg,
            color: mode === "light" ? lightTheme.text : darkTheme.text,
            padding: "20px",
          }}
        >
          <h2 style={{ marginBottom: "10px" }}>잠금 상태</h2>
          <p style={{ marginBottom: "30px", opacity: 0.8 }}>앱을 사용하려면 인증이 필요합니다.</p>

          <button
            onClick={performBiometricAuth}
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

  return (
    <ThemeProvider theme={mode === "light" ? lightTheme : darkTheme}>
      <div style={{ background: mode === "light" ? lightTheme.bg : darkTheme.bg, minHeight: "100vh" }}>
        <Routes>
          <Route path="/" element={<MainPage setMode={setMode} mode={mode} />} />
          <Route path="/settings" element={<SettingsPage setMode={setMode} mode={mode} />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings/currency" element={<CurrencySettingsPage />} />
          <Route path="/source-stats" element={<StatsBySourcePage />} />
          <Route path="/settings/categories" element={<CategorySettingsPage />} />
          <Route path="/calendar-stats" element={<CalendarStatsPage />} />
          <Route path="/detail/chapter/:chapterId" element={<DetailPage />} />
          <Route path="/detail/date/:date/:id/:chapterId" element={<DetailPage />} />
        </Routes>

        <BottomTabBar />
      </div>
    </ThemeProvider>
  );
}
