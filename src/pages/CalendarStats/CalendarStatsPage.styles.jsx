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
  padding-bottom: calc(100px + env(safe-area-inset-bottom));

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

export const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 16px;
`;

export const StatCard = styled.div`
  background: ${({ theme, $tone }) => ($tone === "income" ? theme.incomeSoft : theme.expenseSoft)};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

export const StatLabel = styled.span`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.subText};
`;

export const StatValue = styled.strong`
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme, $tone }) => ($tone === "income" ? theme.incomeColor : theme.expenseColor)};
`;

export const DetailBox = styled.div`
  margin-top: 22px;
  h3 {
    margin: 0 0 12px;
    font-size: 15px;
    font-weight: 800;
    color: ${({ theme }) => theme.text};
  }
`;

/* 카드 스타일 수정: isPaid prop에 따라 배경색 변경 */
export const Card = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: ${({ theme, $isPaid }) => ($isPaid ? theme.completedBg : theme.card)};
  border: 1px solid ${({ theme, $isPaid }) => ($isPaid ? theme.completedBorder : theme.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadowSm};
  padding: 14px 16px;
  margin-bottom: 10px;
  transition: background-color 0.2s ease;
  opacity: ${({ $isPaid }) => ($isPaid ? 0.85 : 1)};
`;

export const TypeTag = styled.span`
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme, $tone }) => ($tone === "income" ? theme.incomeSoft : theme.expenseSoft)};
  color: ${({ theme, $tone }) => ($tone === "income" ? theme.incomeColor : theme.expenseColor)};
`;

/* 제목 스타일 수정: isPaid일 경우 취소선 및 색상 변경 */
export const Title = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-decoration: ${({ $isPaid }) => ($isPaid ? "line-through" : "none")};
  color: ${({ $isPaid, theme }) => ($isPaid ? theme.mutedText : theme.text)};
`;

/* 금액 스타일 수정: isPaid일 경우 취소선 적용 */
export const Amount = styled.div`
  font-size: 16px;
  font-weight: 800;
  color: ${({ type, theme }) => (type === "income" ? theme.incomeColor : theme.expenseColor)};
  text-decoration: ${({ $isPaid }) => ($isPaid ? "line-through" : "none")};
`;
