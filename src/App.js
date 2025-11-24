import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { lightTheme, darkTheme } from './theme';
import { useState } from 'react';

import MainPage from './pages/MainPage';
import DetailPage from './pages/DetailPage';
import SettingsPage from './pages/SettingsPage';
import StatsPage from './pages/StatsPage';
import BottomTabBar from './components/BottomTabBar';
import CurrencySettingsPage from './pages/CurrencySettingsPage';
import StatsBySourcePage from './pages/StatsBySourcePage';

export default function App() {
  const [mode, setMode] = useState("light");

  return (
    <ThemeProvider theme={mode === "light" ? lightTheme : darkTheme}>
      <div style={{ background: mode === "light" ? lightTheme.bg : darkTheme.bg, minHeight: "100vh" }}>
        <Routes>
          <Route path="/" element={<MainPage setMode={setMode} mode={mode} />} />
          <Route path="/detail/:chapterId" element={<DetailPage />} />
          <Route path="/settings" element={<SettingsPage setMode={setMode} mode={mode} />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings/currency" element={<CurrencySettingsPage />} />
          <Route path="/source-stats" element={<StatsBySourcePage />} />

        </Routes>

        <BottomTabBar />
      </div>
    </ThemeProvider>
  )
}
