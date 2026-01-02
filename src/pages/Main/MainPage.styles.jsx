import styled, { keyframes, css } from "styled-components";

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const PageWrap = styled.div`
  width: 100%;
  height: 100vh;
  position: relative;
  background: ${({ theme }) => theme.background};
`;

/* 화면 정중앙 고정 인디케이터 (텍스트 제거 버전) */
export const RefreshIndicator = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  /* 당길 때 크기가 커지면서 나타나는 효과 */
  transform: translate(-50%, -50%) scale(${({ $pullDistance }) => Math.min($pullDistance / 130, 1.1)});
  z-index: 9999; /* 모든 요소보다 위에 표시 */

  width: 50px;
  height: 50px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);

  display: flex;
  align-items: center;
  justify-content: center;

  /* 당기기 시작하면 서서히 나타남 */
  opacity: ${({ $pullDistance }) => ($pullDistance > 20 ? 1 : 0)};
  transition: ${({ $isRefreshing }) => ($isRefreshing ? "none" : "all 0.15s ease")};
  pointer-events: none;

  svg {
    font-size: 26px;
    color: #4caf50;
    /* 동기화 중일 때 무한 회전 */
    animation: ${({ $isRefreshing }) =>
      $isRefreshing
        ? css`
            ${rotate} 1s linear infinite
          `
        : "none"};
  }
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

export const ListWrap = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-top: 100px;
  padding: 0 16px;
  padding-bottom: 160px;
  transform: translateY(${({ $pullDistance }) => Math.min($pullDistance * 0.2, 10)}px);
`;

export const CreateBtn = styled.button`
  background: #1976d2;
  color: ${({ theme }) => theme.headerText};
  padding: 8px 14px;
  border-radius: 6px;

  border: 1px solid ${({ theme }) => theme.border};

  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
`;

export const ChapterItem = styled.div`
  display: flex;
  align-items: center;
  padding: 20px 16px;
  background: ${({ theme, $completed }) => ($completed ? theme.completedBg : theme.card)};
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid ${({ theme, $completed }) => ($completed ? theme.completedBorder : theme.border)};
  color: ${({ theme }) => theme.text};
  transition: background-color 0.25s ease, transform 0.15s ease;

  &:active {
    transform: scale(0.98);
    background: ${({ theme }) => theme.activeBg};
  }
`;

export const ChapterLink = styled.span`
  flex: 1;
  color: inherit;
`;

export const DeleteBtn = styled.button`
  background: #d9534f;
  color: white;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  margin-left: 8px;
`;

export const CompleteBtn = styled.button`
  background: #4caf50;
  color: white;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  margin-left: 8px;
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
