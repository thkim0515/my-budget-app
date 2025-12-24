import styled from "styled-components";

export const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

export const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  max-width: 480px;
  margin: 0 auto;
  z-index: 20;
`;

export const Content = styled.div`
  flex: 1;
  padding: 16px;
  padding-top: 96px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));

  overflow-y: auto;
  color: ${({ theme }) => theme.text};

  /* 캘린더 */
  .react-calendar {
    background: ${({ theme }) => theme.card};
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 10px;
    padding: 8px;
    width: 100%;
  }

  .react-calendar__navigation button {
    color: ${({ theme }) => theme.text};
  }

  .react-calendar__month-view__weekdays__weekday {
    text-align: center;
    font-weight: bold;
  }

  /* 요일 헤더 */
  .react-calendar__month-view__weekdays__weekday:nth-child(1) {
    color: #e74c3c;
  }

  .react-calendar__month-view__weekdays__weekday:nth-child(7) {
    color: #3498db;
  }

  /* 날짜 타일 */
  .react-calendar__tile {
    background: transparent !important;
    border-radius: 6px;
    min-height: 75px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }

  /* 오늘 날짜 */
  .react-calendar__tile--now abbr {
    color: ${({ theme }) => theme.text} !important;
    font-weight: bold;
  }

  /* 공휴일 */
  .day-holiday abbr {
    color: #e74c3c !important;
    font-weight: bold !important;
  }

  /* 일요일 */
  .day-sun abbr {
    color: #e74c3c !important;
  }

  /* 토요일 */
  .day-sat abbr {
    color: #3498db !important;
  }

  /* 평일 */
  .day-weekday abbr {
    color: ${({ theme }) => theme.text} !important;
  }

  /* 선택된 날짜 */
  .selected-tile {
    background: ${({ theme }) => theme.activeBg} !important;
    border: 1px solid ${({ theme }) => theme.activeText};
  }

  .selected-tile abbr {
    color: ${({ theme }) => theme.activeText} !important;
    font-weight: bold !important;
  }

  .calendar-slide {
    transition: transform 0.15s ease, opacity 0.15s ease;
  }

  .slide-left {
    transform: translateX(-50px);
    opacity: 0;
  }

  .slide-right {
    transform: translateX(50px);
    opacity: 0;
  }

  .react-calendar__tile.day-holiday {
    pointer-events: auto !important; /* ← 클릭 활성화 */
    opacity: 1 !important; /* ← 혹시 투명하게 렌더링되는 문제 방지 */
  }

  .not-current-month {
    opacity: 0.35 !important; /* 투명도 */
    color: ${({ theme }) => theme.text}55 !important; /* 밝은 색 */
  }
  .react-calendar__tile abbr {
    pointer-events: none !important;
  }

  .selected-tile {
    background: ${({ theme }) => theme.activeBg} !important;
    border: 1px solid ${({ theme }) => theme.activeText};
  }
  .selected-tile abbr {
    color: ${({ theme }) => theme.activeText} !important;
  }
`;

export const AmountBox = styled.div`
  font-size: 10px;
  margin-top: 2px;
  text-align: center;
`;

export const SummaryBox = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 8px;
`;

export const Row = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
`;

export const DetailBox = styled.div`
  margin-top: 20px;
`;

/* 카드 스타일 수정: isPaid prop에 따라 배경색 변경 */
export const Card = styled.div`
  background: ${({ theme, $isPaid }) => ($isPaid ? "#e0e0e0" : theme.card)};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
  transition: background-color 0.2s ease;
  opacity: ${({ $isPaid }) => ($isPaid ? 0.85 : 1)};
`;

/* 제목 스타일 수정: isPaid일 경우 취소선 및 색상 변경 */
export const Title = styled.div`
  font-size: 14px;
  margin-bottom: 6px;
  text-decoration: ${({ $isPaid }) => ($isPaid ? "line-through" : "none")};
  color: ${({ $isPaid, theme }) => ($isPaid ? "#888" : theme.text)};
`;

/* 금액 스타일 수정: isPaid일 경우 취소선 적용 */
export const Amount = styled.div`
  font-size: 16px;
  font-weight: bold;
  color: ${({ type }) => (type === "income" ? "#2ecc71" : "#e74c3c")};
  text-decoration: ${({ $isPaid }) => ($isPaid ? "line-through" : "none")};
`;
