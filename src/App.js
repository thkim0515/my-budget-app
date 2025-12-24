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

import { useBudgetDB } from "./hooks/useBudgetDB";
import { parseAndCreateRecord } from "./utils/notiParser";

const getInitialMode = () => {
  const savedMode = localStorage.getItem("themeMode");
  return savedMode || "light";
};

export default function App() {
  const [mode, setMode] = useState(getInitialMode);
  const { add, getAll } = useBudgetDB();

  const { isLocked, isChecking, authenticate } = useBiometricLock();
  useAndroidBackHandler();

  useEffect(() => {
    localStorage.setItem("themeMode", mode);
  }, [mode]);

  useEffect(() => {
    const handleNotification = async (text) => {
      try {
        const recordData = parseAndCreateRecord(text);
        if (!recordData) return;

        // 1. 모든 챕터 로드
        const chapters = await getAll('chapters');
        
        // 2. 알림 날짜에 해당하는 챕터 타이틀(예: "2025년 12월")로 검색
        let targetChapter = chapters.find(c => c.title === recordData.chapterTitle);

        // 3. 만약 해당 월의 챕터가 없다면 새로 생성 (DetailPage의 saveRecord 로직 준수)
        if (!targetChapter) {
          const newChapterId = await add('chapters', {
            title: recordData.chapterTitle,
            createdAt: new Date(recordData.date),
            order: chapters.length,
            isTemporary: false
          });
          targetChapter = { chapterId: newChapterId };
        }

        // 4. 찾거나 생성한 챕터의 ID(chapterId)로 레코드 저장
        // recordData에서 임시 필드 chapterTitle은 제외하고 저장
        const { chapterTitle, ...finalRecord } = recordData;
        
        await add('records', { 
          ...finalRecord, 
          chapterId: targetChapter.chapterId 
        });
        
        console.log(`%c[기록 완료] ${recordData.chapterTitle} -> ${recordData.title}`, "color: #4CAF50; font-weight: bold;");
        
        // 브라우저에서 즉시 확인을 위한 알림
        if (window.confirm(`자동 기록되었습니다.\n[${recordData.chapterTitle}] ${recordData.title}\n상세 페이지로 이동하시겠습니까?`)) {
          window.location.href = `/detail/chapter/${targetChapter.chapterId}`;
        }
      } catch (error) {
        console.error("자동 기록 실패:", error);
      }
    };

    window.simulateNoti = (text) => handleNotification(text);
    return () => delete window.simulateNoti;
  }, [add, getAll]);

  if (isChecking) return null;

  if (isLocked) {
    return <LockScreen mode={mode} onAuthenticate={authenticate} />;
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