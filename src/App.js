import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { getLightTheme, getDarkTheme } from "./theme";
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
  TextColorSettingsPage // 🔥 추가
} from "./appImports";

import { useNativeSync } from "./hooks/useNativeSync";

const getInitialMode = () => {
  const savedMode = localStorage.getItem("themeMode");
  return savedMode || "light";
};

export default function App() {
  const [mode, setMode] = useState(getInitialMode);
  const [lightTextColor, setLightTextColor] = useState(localStorage.getItem("lightTextColor") || "#222222");
  const [darkTextColor, setDarkTextColor] = useState(localStorage.getItem("darkTextColor") || "#e5e5e5");

  const { isLocked, isChecking, authenticate } = useBiometricLock();
  useAndroidBackHandler();
  useNativeSync();

  useEffect(() => {
    localStorage.setItem("themeMode", mode);
  }, [mode]);

  if (isChecking) return null;
  if (isLocked) return <LockScreen mode={mode} onAuthenticate={authenticate} />;

  const theme = mode === "light" ? getLightTheme(lightTextColor) : getDarkTheme(darkTextColor);

  return (
    <ThemeProvider theme={theme}>
      <div style={{ background: theme.bg, minHeight: "100vh", transition: "background 0.3s ease" }}>
        <Routes>
          <Route path="/" element={<MainPage setMode={setMode} mode={mode} />} />
          <Route path="/settings" element={<SettingsPage setMode={setMode} mode={mode} />} />
          <Route 
            path="/settings/text-color" 
            element={
              <TextColorSettingsPage 
                lightTextColor={lightTextColor}
                setLightTextColor={setLightTextColor}
                darkTextColor={darkTextColor}
                setDarkTextColor={setDarkTextColor}
              />
            } 
          />
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