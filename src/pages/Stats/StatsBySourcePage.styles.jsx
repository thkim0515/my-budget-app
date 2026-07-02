import styled from "styled-components";

// 페이지 전체 레이아웃 컨테이너
export const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.bg};
  color: ${({ theme }) => theme.text};
`;

// 상단 고정 헤더 영역
export const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  z-index: 20;
`;

// 스크롤 가능한 콘텐츠 영역
export const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-top: 96px;
  padding-bottom: calc(100px + env(safe-area-inset-bottom));
`;

export const MonthSelector = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 17px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.text};
`;

export const ArrowBtn = styled.button`
  width: 38px;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 50%;
  font-size: 18px;
  color: ${({ theme }) => theme.subText};
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadowSm};
  &:active { transform: scale(0.92); }
`;

// 총 지출 요약 카드
export const TotalCard = styled.div`
  background: ${({ theme }) => theme.headerGradient};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 20px;
  margin-bottom: 18px;
  color: #fff;
  box-shadow: ${({ theme }) => theme.shadowPrimary};

  span {
    font-size: 13px;
    font-weight: 600;
    opacity: 0.85;
  }
  strong {
    display: block;
    margin-top: 4px;
    font-size: 26px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  small {
    display: block;
    margin-top: 6px;
    font-size: 12px;
    opacity: 0.8;
  }
`;

export const SortBar = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-bottom: 10px;
`;

export const SortBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: ${({ theme }) => theme.cardAlt};
  color: ${({ theme }) => theme.subText};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  padding: 7px 14px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  &:active { transform: scale(0.96); }
`;

export const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const SourceCard = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius.md};
  box-shadow: ${({ theme }) => theme.shadowSm};
  padding: 14px 16px;
`;

export const SourceTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
`;

export const SourceName = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const Rank = styled.span`
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 800;
  background: ${({ theme, $top }) => ($top ? theme.primary : theme.primarySoft)};
  color: ${({ theme, $top }) => ($top ? theme.onPrimary : theme.primaryText)};
`;

export const SourceAmount = styled.div`
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: ${({ theme }) => theme.expenseColor};
  white-space: nowrap;
`;

export const BarTrack = styled.div`
  position: relative;
  height: 8px;
  border-radius: 999px;
  background: ${({ theme }) => theme.bgElevated};
  overflow: hidden;
`;

export const BarFill = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: ${({ $pct }) => $pct}%;
  border-radius: 999px;
  background: ${({ theme }) => theme.gradientPrimary};
  transition: width 0.4s cubic-bezier(0.2, 0, 0, 1);
`;

export const SubMeta = styled.div`
  margin-top: 8px;
  font-size: 11.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.mutedText};
  text-align: right;
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 48px 20px;
  color: ${({ theme }) => theme.mutedText};
  background: ${({ theme }) => theme.cardAlt};
  border: 1px dashed ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: 14px;
`;
