import { useEffect, useRef } from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { getLightTheme, getDarkTheme } from "./theme";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./db/firebase";

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
  PrivacyPolicyPage,
} from "./appImports";

import { useNativeSync } from "./hooks/useNativeSync";
import { useSync } from "./hooks/useSync";
import { syncParsingRules } from "./utils/notiParser";

function AppContent() {
  const { settings } = useSettings();
  const { isLocked, isChecking, authenticate, needsPinFallback, verifyPin } = useBiometricLock();

  useAndroidBackHandler();
  useNativeSync();
  const { syncWithFirestore } = useSync();

  // [핵심 수정] syncWithFirestore 함수가 재생성되더라도 useEffect를 다시 실행시키지 않기 위해 Ref 사용
  const syncRef = useRef(syncWithFirestore);

  // syncWithFirestore가 갱신될 때마다 Ref 업데이트 (useEffect 트리거 안 함)
  useEffect(() => {
    syncRef.current = syncWithFirestore;
  }, [syncWithFirestore]);

  useEffect(() => {
    // 파싱 규칙 감시
    const unsubscribeRules = syncParsingRules();

    // 1. 로그인 상태 감지 -> 동기화
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user && syncRef.current) {
        console.log(`👤 로그인 감지 (${user.email}): 동기화 시작`);
        syncRef.current(user.uid);
      }
    });

    // 2. 로컬 DB 변경 감지 -> 동기화
    const handleLocalUpdate = async () => {
      const user = auth.currentUser;
      if (user && syncRef.current) {
        console.log("💾 로컬 변경 감지: 서버 동기화 시도");
        await syncRef.current(user.uid);
      }
    };

    window.addEventListener("budget-db-updated", handleLocalUpdate);

    return () => {
      if (unsubscribeRules) unsubscribeRules();
      unsubscribeAuth();
      window.removeEventListener("budget-db-updated", handleLocalUpdate);
    };
  }, []); // [핵심] 빈 배열로 설정하여 컴포넌트 마운트 시 딱 1번만 실행 (루프 방지)

  if (isChecking) return null;

  if (isLocked) return <LockScreen onAuthenticate={authenticate} needsPinFallback={needsPinFallback} onVerifyPin={verifyPin} />;

  const theme = settings.mode === "light" ? getLightTheme(settings.lightTextColor) : getDarkTheme(settings.darkTextColor);

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

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}
