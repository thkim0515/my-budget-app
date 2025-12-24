import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { lightTheme, darkTheme } from "./theme";
import { useState, useEffect } from "react";

import useBiometricLock from "./hooks/useBiometricLock";
import useAndroidBackHandler from "./hooks/useAndroidBackHandler";
import LockScreen from "./components/LockScreen";

import MainPage from "./pages/Main/MainPage";
import DetailPage from "./pages/Main/DetailPage";
import SettingsPage from "./pages/Settings/SettingsPage";
import StatsPage from "./pages/Stats/StatsPage";
import BottomTabBar from "./components/BottomTabBar";
import CurrencySettingsPage from "./pages/Settings/CurrencySettingsPage";
import StatsBySourcePage from "./pages/Stats/StatsBySourcePage";
import CategorySettingsPage from "./pages/Settings/CategorySettingsPage";
import CalendarStatsPage from "./pages/CalendarStats/CalendarStatsPage";

const getInitialMode = () => {
  const savedMode = localStorage.getItem("themeMode");
  return savedMode || "light";
};

export default function App() {
  const [mode, setMode] = useState(getInitialMode);

  const {
    isLocked,
    isChecking,
    authenticate,
  } = useBiometricLock();

  useAndroidBackHandler();

  useEffect(() => {
    localStorage.setItem("themeMode", mode);
  }, [mode]);

  if (isChecking) return null;

  if (isLocked) {
    return (
      <LockScreen
        mode={mode}
        onAuthenticate={authenticate}
      />
    );
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
