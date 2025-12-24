import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { lightTheme, darkTheme } from "./theme";
import { useState, useEffect } from "react";

import {
  useBiometricLock,
  useAndroidBackHandler,
  LockScreen,
  BottomTabBar,
  MainPage,
  DetailPage,
  SettingsPage,
  StatsPage,
  CurrencySettingsPage,
  StatsBySourcePage,
  CategorySettingsPage,
  CalendarStatsPage,
} from "./appImports";

// 🔥 네이티브 자동 동기화 훅
import { useNativeSync } from "./hooks/useNativeSync";

const getInitialMode = () => {
  const savedMode = localStorage.getItem("themeMode");
  return savedMode || "light";
};

export default function App() {
  const [mode, setMode] = useState(getInitialMode);

  // 생체 인증 / 뒤로가기
  const { isLocked, isChecking, authenticate } = useBiometricLock();
  useAndroidBackHandler();

  // 🔥 앱 실행 시 네이티브 알림 자동 동기화
  useNativeSync();

  // 테마 저장
  useEffect(() => {
    localStorage.setItem("themeMode", mode);
  }, [mode]);

  // 생체 인증 체크 중
  if (isChecking) return null;

  // 잠금 상태
  if (isLocked) {
    return <LockScreen mode={mode} onAuthenticate={authenticate} />;
  }

  return (
    <ThemeProvider theme={mode === "light" ? lightTheme : darkTheme}>
      <div
        style={{
          background: mode === "light" ? lightTheme.bg : darkTheme.bg,
          minHeight: "100vh",
        }}
      >
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
