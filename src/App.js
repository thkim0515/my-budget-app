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
  TextColorSettingsPage,
  PrivacyPolicyPage
} from "./appImports";

import { useNativeSync } from "./hooks/useNativeSync";
import { syncParsingRules } from "./utils/notiParser"; // Task 3: 파싱 규칙 동기화 함수 임포트

// import { uploadInitialRules } from "./utils/initFirestoreData"; // 초기 데이터 설정용

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

  // 1. 앱 초기 구동 시 Firestore에서 파싱 규칙을 딱 한 번만 불러옵니다.
  useEffect(() => {

    // 초기 데이터 밀어넣기용 ( 혹은 데이터 추가시 개인 로컬에서 실행시 파베 업뎃 )
    // uploadInitialRules().then(success => {
    //   if (success) alert("데이터가 성공적으로 복구되었습니다. 다시 주석 처리해주세요!");
    // });


    // syncParsingRules는 실시간 감시를 시작하고, 중단 함수(unsubscribe)를 반환
    const unsubscribe = syncParsingRules();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);


  // 2. 테마 모드가 변경될 때마다 로컬 스토리지에 저장합니다.
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
          <Route path="/settings/privacy" element={<PrivacyPolicyPage />} />
        </Routes>
        <BottomTabBar />
      </div>
    </ThemeProvider>
  );
}