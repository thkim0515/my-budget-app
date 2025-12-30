import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { getLightTheme, getDarkTheme } from "./theme";
import { useEffect } from "react";
import { SettingsProvider, useSettings } from "./context/SettingsContext";

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
  TextColorSettingsPage,
  PrivacyPolicyPage
} from "./appImports";

import { useNativeSync } from "./hooks/useNativeSync";
import { syncParsingRules } from "./utils/notiParser"; 
// import { uploadInitialRules } from "./utils/initFirestoreData"; // 초기 데이터 설정용

function AppContent() {
  const { settings } = useSettings(); // Context에서 모든 설정값 가져오기
  const { isLocked, isChecking, authenticate } = useBiometricLock();
  
  useAndroidBackHandler();
  useNativeSync();

  // 1. 앱 초기 구동 시 Firestore 실시간 감시 및 초기 설정
  useEffect(() => {
    // 초기 데이터 밀어넣기용 주석 기능 유지
    /*
    uploadInitialRules().then(success => {
      if (success) alert("데이터가 성공적으로 복구되었습니다. 다시 주석 처리해주세요!");
    });
    */

    // syncParsingRules는 실시간 감시를 시작하고, 중단 함수(unsubscribe)를 반환
    const unsubscribe = syncParsingRules();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  if (isChecking) return null;
  
  // 잠금 화면 처리
  if (isLocked) return <LockScreen mode={settings.mode} onAuthenticate={authenticate} />;

  // Context의 설정을 바탕으로 테마 생성
  const theme = settings.mode === "light" 
    ? getLightTheme(settings.lightTextColor) 
    : getDarkTheme(settings.darkTextColor);

  return (
    <ThemeProvider theme={theme}>
      <div style={{ background: theme.bg, minHeight: "100vh", transition: "background 0.3s ease" }}>
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/text-color" element={<TextColorSettingsPage />} />
          
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/settings/currency" element={<CurrencySettingsPage />} />
          <Route path="/source-stats" element={<StatsBySourcePage />} />
          <Route path="/settings/categories" element={<CategorySettingsPage />} />
          <Route path="/calendar-stats" element={<CalendarStatsPage />} />
          <Route path="/detail/chapter/:chapterId" element={<DetailPage />} />
          <Route path="/detail/date/:date/:id/:chapterId" element={<DetailPage />} />
          <Route path="/settings/privacy" element={<PrivacyPolicyPage />} />
        </Routes>
        <BottomTabBar />
      </div>
    </ThemeProvider>
  );
}

// 최상위에서 Provider로 감싸줍니다.
export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}