import { useEffect } from "react";
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
import { useSync } from "./hooks/useSync"; // [추가] 클라우드 동기화 훅
import { syncParsingRules } from "./utils/notiParser";

function AppContent() {
  const { settings } = useSettings();
  const { isLocked, isChecking, authenticate } = useBiometricLock();

  // 훅 초기화
  useAndroidBackHandler();
  useNativeSync(); // 문자/앱푸시 -> 로컬 DB 저장
  const { syncWithFirestore } = useSync(); // 로컬 DB <-> Firestore 동기화

  // 1. 앱 초기 구동 시 설정 및 동기화 트리거 연결
  useEffect(() => {
    // 파싱 규칙 실시간 감시
    const unsubscribeRules = syncParsingRules();

    // [핵심] 로그인 상태 감지 -> 자동 동기화 시작
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log(`👤 로그인 감지 (${user.email}): 클라우드 동기화 시작`);
        syncWithFirestore(user.uid);
      }
    });

    // [핵심] 로컬 DB 변경 감지 (문자 수신, 수동 입력 등) -> 서버로 전송
    const handleLocalUpdate = async () => {
      const user = auth.currentUser;
      if (user) {
        console.log("💾 로컬 변경 감지: 서버 동기화 시도");
        await syncWithFirestore(user.uid);
      }
    };

    window.addEventListener("budget-db-updated", handleLocalUpdate);

    return () => {
      if (unsubscribeRules) unsubscribeRules();
      unsubscribeAuth();
      window.removeEventListener("budget-db-updated", handleLocalUpdate);
    };
  }, [syncWithFirestore]);

  if (isChecking) return null;

  // 잠금 화면 처리
  if (isLocked) return <LockScreen mode={settings.mode} onAuthenticate={authenticate} />;

  // 테마 적용
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
