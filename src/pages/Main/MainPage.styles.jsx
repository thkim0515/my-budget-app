import styled, { keyframes, css } from "styled-components";

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

/* 전체 페이지 레이아웃 - StatsPage와 동일하게 max-width 및 중앙 정렬 적용 */
export const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  position: relative;
  background: ${({ theme }) => theme.background};
  color: ${({ theme }) => theme.text};
  display: flex;
  flex-direction: column;
`;

/* 헤더 고정 컨테이너 - StatsPage와 동일하게 max-width 및 margin: 0 auto 적용 */
export const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  z-index: 20;
  background: ${({ theme }) => theme.background};
  border-bottom: none;
`;

/* 새로고침 인디케이터 */
export const RefreshIndicator = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) scale(${({ $pullDistance }) => Math.min($pullDistance / 130, 1.1)});
  z-index: 9999;

  width: 50px;
  height: 50px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  display: flex;
  align-items: center;
  justify-content: center;

  opacity: ${({ $pullDistance }) => ($pullDistance > 20 ? 1 : 0)};
  transition: ${({ $isRefreshing }) => ($isRefreshing ? "none" : "all 0.15s ease")};
  pointer-events: none;

  svg {
    font-size: 26px;
    color: #4caf50;
    animation: ${({ $isRefreshing }) =>
      $isRefreshing
        ? css`
            ${rotate} 1s linear infinite
          `
        : "none"};
  }
`;

/* 리스트 영역 - StatsPage의 Content 구조와 동기화 */
export const ListWrap = styled.div`
  flex: 1;
  overflow-y: auto;

  /* 헤더 높이만큼 띄워줌 */
  margin-top: 88px;
  padding: 16px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));

  width: 100%;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;

  /* 당기기 애니메이션 최적화 */
  transition: ${({ $isRefreshing }) => ($isRefreshing ? "transform 0.2s ease" : "none")};
`;

export const CreateBtn = styled.button`
  background: #1976d2;
  color: white;
  padding: 8px 14px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 14px;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  cursor: pointer;

  &:active {
    transform: scale(0.95);
  }
`;

export const ChapterItem = styled.div`
  display: flex;
  align-items: center;
  padding: 20px 16px;
  background: ${({ theme, $completed }) => ($completed ? theme.completedBg : theme.card)};
  border-radius: 12px;
  margin-bottom: 12px;
  border: 1px solid ${({ theme, $completed }) => ($completed ? theme.completedBorder : theme.border)};
  color: ${({ theme }) => theme.text};
  transition: background-color 0.25s ease, transform 0.15s ease;
  cursor: pointer;

  &:active {
    transform: scale(0.98);
    background: ${({ theme }) => theme.activeBg};
  }
`;

export const ChapterLink = styled.span`
  flex: 1;
  color: inherit;
  font-weight: 600;
  font-size: 16px;
`;

export const DeleteBtn = styled.button`
  background: #d9534f;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  margin-left: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`;

export const CompleteBtn = styled.button`
  background: #4caf50;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 6px;
  margin-left: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  animation: slideIn 0.25s ease forwards;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;
