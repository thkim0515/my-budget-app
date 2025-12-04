import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme } from './theme';
import { useState } from 'react';
import { App as CapacitorApp } from "@capacitor/app";
import { useEffect } from "react";

import MainPage from './pages/MainPage';
import DetailPage from './pages/DetailPage';
import SettingsPage from './pages/SettingsPage';
import StatsPage from './pages/StatsPage';
import BottomTabBar from './components/BottomTabBar';
import CurrencySettingsPage from './pages/CurrencySettingsPage';
import StatsBySourcePage from './pages/StatsBySourcePage';
import CategorySettingsPage from './pages/CategorySettingsPage';
import CalendarStatsPage from './pages/CalendarStatsPage';
// import DateDetailPage from './pages/DateDetailPage';

export default function App() {
  const [mode, setMode] = useState("light");

  useEffect(() => {
    const handler = CapacitorApp.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        // 뒤로 갈 페이지 없으면 앱 종료 방지
        // 종료 원하면 아래 사용
        // CapacitorApp.exitApp();
      }
    });

    return () => handler.remove();
  }, []);

  return (
    <ThemeProvider theme={mode === "light" ? lightTheme : darkTheme}>
      <div style={{ background: mode === "light" ? lightTheme.bg : darkTheme.bg, minHeight: "100vh" }}>
        <Routes>
          <Route path="/" element={<MainPage setMode={setMode} mode={mode} />} />
          {/* <Route path="/detail/:chapterId" element={<DetailPage />} /> */}
          <Route path="/settings" element={<SettingsPage setMode={setMode} mode={mode} />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings/currency" element={<CurrencySettingsPage />} />
          <Route path="/source-stats" element={<StatsBySourcePage />} />
          <Route path="/settings/categories" element={<CategorySettingsPage />} />
          <Route path="/calendar-stats" element={<CalendarStatsPage />} />
          {/* <Route path="/detail/:date/:id" element={<DetailPage />} /> */}
          {/* <Route path="/detail/:chapterId" element={<DetailPage />} />
          <Route path="/detail/:date/:id" element={<DateDetailPage />} /> */}
          <Route path="/detail/chapter/:chapterId" element={<DetailPage />} />
          <Route path="/detail/date/:date/:id/:chapterId" element={<DetailPage />} />





        </Routes>

        <BottomTabBar />
      </div>
    </ThemeProvider>
  )
}
