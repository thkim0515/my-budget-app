/* src/pages/Main/MainPage.styles.jsx */
import styled, { keyframes, css } from "styled-components";

const rotate = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

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

export const ListWrap = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-top: 88px;
  padding: 16px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
  width: 100%;
  max-width: 480px;
  margin-left: auto;
  margin-right: auto;
  box-sizing: border-box;
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
  min-height: 64px;
  padding: 0 16px;
  /* 포탈 이동 시 theme을 잃을 수 있으므로 기본 배경/글자색 보완 */
  background: ${({ theme, $completed, $isPressed, $isDragging }) =>
    $isDragging ? "#e0e0e0" : $isPressed ? theme.activeBg || "#f0f0f0" : $completed ? theme.completedBg || "#f9f9f9" : theme.card || "#ffffff"};
  border-radius: 12px;
  margin-bottom: 12px;
  border: 1px solid ${({ theme, $completed, $isPressed, $isDragging }) => ($isDragging ? "#1976d2" : $isPressed ? "#1976d2" : $completed ? theme.completedBorder : theme.border || "#eee")};
  color: ${({ theme }) => theme.text || "#333"};

  transition: ${({ $isDragging }) => ($isDragging ? "none" : "background-color 0.2s ease, transform 0.1s ease")};
  cursor: pointer;
  opacity: ${({ $isDragging }) => ($isDragging ? 0.95 : 1)};
  box-shadow: ${({ $isDragging }) => ($isDragging ? "0 8px 24px rgba(0,0,0,0.2)" : "none")};

  touch-action: none;
  position: relative;
  z-index: ${({ $isDragging }) => ($isDragging ? 9999 : 1)};
  box-sizing: border-box;
`;

export const ChapterLink = styled.span`
  flex: 1;
  color: inherit;
  font-weight: 600;
  font-size: 16px;
  line-height: 64px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block; /* Flex 환경에서 너비 유지 */
`;

export const ActionGroup = styled.div`
  display: flex;
  gap: 8px;
  width: 100%;
  justify-content: flex-end;
  align-items: center;
  height: 64px;
`;

export const DeleteBtn = styled.button`
  background: #d9534f;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`;

export const CompleteBtn = styled.button`
  background: #4caf50;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`;

export const CloseBtn = styled.button`
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 14px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
`;
