import styled from "styled-components";

export const PageWrap = styled.div`
  /* 페이지의 최대 너비를 설정하여 모바일 뷰를 유지합니다. */
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  color: ${({ theme }) => theme.text};
`;

export const HeaderFix = styled.div`
  /* 헤더를 상단에 고정합니다. */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: 480px;
  z-index: 20;
`;

export const Content = styled.div`
  /* 스크롤 가능한 본문 영역입니다. */
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-top: 96px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));

  width: 100%;
  max-width: 480px;
  margin: 0 auto;

  .slide-box {
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
`;

export const ChartBox = styled.div`
  /* 차트를 감싸는 카드 스타일입니다. */
  margin-top: 20px;
  background: ${({ theme }) => theme.card};
  padding: 20px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.border};
`;

export const Table = styled.table`
  /* 챕터별 요약 테이블 스타일입니다. */
  width: 100%;
  margin-top: 20px;
  border-collapse: collapse;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  overflow: hidden;
`;

export const Th = styled.th`
  /* 테이블 헤더 스타일입니다. */
  padding: 12px 8px;
  background: ${({ theme }) => theme.headerBg};
  color: ${({ theme }) => theme.headerText};
  text-align: center;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

export const Td = styled.td`
  /* 테이블 데이터 셀 스타일입니다. */
  padding: 12px 8px;
  text-align: center;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.text};
  &:last-child {
    font-weight: bold;
  }
`;

export const MonthSelector = styled.div`
  /* 기간 표시 및 좌우 이동 버튼 레이아웃입니다. */
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: bold;
`;

export const ArrowBtn = styled.button`
  /* 월 이동 버튼 스타일입니다. */
  background: transparent;
  border: none;
  font-size: 22px;
  color: ${({ theme }) => theme.text};
  cursor: pointer;
`;

// 기간 선택 버튼을 위한 스타일 추가
export const RangeSelector = styled.div`
  /* 1/3/6/12개월 선택 버튼 레이아웃입니다. */
  display: flex;
  justify-content: space-around;
  gap: 8px;
  margin-bottom: 20px;
`;

export const RangeButton = styled.button`
  /* 기간 선택 버튼의 기본 스타일 및 활성화 상태 스타일입니다. */
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border};
  /* $active는 styled-components에서 transient prop으로 처리되어 DOM에 전달되지 않습니다. */
  background: ${({ theme, $active }) => ($active ? theme.headerBg : theme.card)};
  color: ${({ theme, $active }) => ($active ? theme.headerText : theme.text)};
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 0;
`;
