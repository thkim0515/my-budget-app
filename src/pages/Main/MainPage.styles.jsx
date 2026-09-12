/* src/pages/Main/MainPage.styles.jsx */
import styled from "styled-components";

export const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  position: relative;
  background: ${({ theme }) => theme.bg};
  color: ${({ theme }) => theme.text};
  display: flex;
  flex-direction: column;
  overscroll-behavior: none;
`;

export const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  z-index: 20;
  background: ${({ theme }) => theme.headerBg};
`;

export const HeaderButtons = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`;

export const ListWrap = styled.div`
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding: 18px 16px;
  padding-top: calc(env(safe-area-inset-top) + 96px);
  padding-bottom: calc(${({ $withCardLimit }) => ($withCardLimit ? "168px" : "100px")} + env(safe-area-inset-bottom));
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  box-sizing: border-box;
  overscroll-behavior: contain;
`;

// 하단 탭바(72px) 바로 위에 고정되는 카드 한도 표시 영역.
// 리스트 스크롤을 가리지 않도록 ListWrap 쪽 padding-bottom을 함께 늘려준다.
export const CardLimitBar = styled.div`
  position: fixed;
  bottom: calc(72px + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  box-sizing: border-box;
  z-index: 15;
  padding: 12px 16px;
  background: ${({ theme }) => theme.card};
  border-top: 1px solid ${({ theme }) => theme.border};
  box-shadow: 0 -4px 12px rgba(20, 30, 60, 0.06);
`;

export const CardLimitTitle = styled.div`
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.subText};
  margin-bottom: 4px;
`;

export const CardLimitAmount = styled.div`
  font-size: 18px;
  font-weight: 800;
  color: ${({ $color }) => $color};
  margin-bottom: 8px;
`;

export const CardLimitTrack = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: ${({ theme }) => theme.border};
  overflow: hidden;
`;

export const CardLimitFill = styled.div`
  height: 100%;
  border-radius: 3px;
  background: ${({ $color }) => $color};
  width: ${({ $ratio }) => `${$ratio * 100}%`};
  transition: width 0.3s ease, background 0.3s ease;
`;

export const CreateBtn = styled.button`
  background: ${({ theme }) => theme.gradientPrimary};
  color: white;
  padding: 9px 16px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: none;
  font-size: 13.5px;
  font-weight: 700;
  box-shadow: ${({ theme }) => theme.shadowPrimary};
  cursor: pointer;
  white-space: nowrap;
  &:active { transform: scale(0.95); }
`;

export const SortBtn = styled.button`
  background: ${({ theme }) => theme.cardAlt};
  color: ${({ theme }) => theme.subText};
  padding: 9px 13px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ theme }) => theme.border};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 4px;
  &:active { transform: scale(0.95); }
`;

export const HideCompletedBtn = styled.button`
  background: ${({ $on, theme }) => ($on ? theme.primary : theme.cardAlt)};
  color: ${({ $on, theme }) => ($on ? "#fff" : theme.subText)};
  padding: 9px 13px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ $on, theme }) => ($on ? theme.primary : theme.border)};
  font-size: 12.5px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  &:active { transform: scale(0.95); }
`;

export const ChapterRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 14px;
  padding: 18px;
  margin-bottom: 14px;
  background: ${({ theme, $completed }) =>
    $completed ? theme.completedBg : theme.card};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme, $completed }) =>
    $completed ? theme.completedBorder : theme.border};
  box-shadow: ${({ theme }) => theme.shadowSm};
  color: ${({ theme }) => theme.text};
  opacity: ${({ $completed }) => ($completed ? 0.72 : 1)};
  box-sizing: border-box;
  transition: transform 0.12s, box-shadow 0.2s;
  &:active { transform: scale(0.995); }
`;

export const ChapterMain = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  padding: 2px 2px 0;
`;

export const ChapterTitle = styled.span`
  font-weight: 800;
  font-size: 17px;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
`;

export const StatRow = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid ${({ theme }) => theme.border};
`;

export const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;

  small {
    font-size: 11px;
    font-weight: 700;
    color: ${({ theme }) => theme.mutedText};
  }
  strong {
    font-size: 13.5px;
    font-weight: 800;
    letter-spacing: -0.02em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: ${({ theme, $tone, $negative }) =>
      $negative ? theme.expenseColor
      : $tone === "income" ? theme.incomeColor
      : $tone === "expense" ? theme.expenseColor
      : theme.text};
  }
`;

export const ActionGroup = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
`;

export const ActionBtn = styled.button`
  flex: 1;
  background: ${({ $bg }) => $bg || "#888"};
  color: #fff;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  padding: 10px 6px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  white-space: nowrap;
  &:active { transform: scale(0.95); opacity: 0.9; }
`;

export const EmptyState = styled.div`
  text-align: center;
  padding: 70px 20px;
  color: ${({ theme }) => theme.mutedText};
  p { margin: 6px 0; font-size: 15px; }
  p:first-child { font-size: 17px; font-weight: 700; color: ${({ theme }) => theme.subText}; }
`;
