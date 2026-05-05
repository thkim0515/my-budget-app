/* src/pages/Main/MainPage.styles.jsx */
import styled from "styled-components";

export const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  position: relative;
  background: ${({ theme }) => theme.background};
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
  background: ${({ theme }) => theme.background};
  border-bottom: none;
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
  overscroll-behavior: contain;
  touch-action: pan-y;
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
  background: ${({ theme, $completed, $isDragging }) =>
    $isDragging ? "#e0e0e0" : $completed ? theme.completedBg || "#f9f9f9" : theme.card || "#ffffff"};
  border-radius: 12px;
  border: 1px solid ${({ theme, $completed, $isDragging }) => ($isDragging ? "#1976d2" : $completed ? theme.completedBorder : theme.border || "#eee")};
  color: ${({ theme }) => theme.text || "#333"};

  transition: ${({ $isDragging }) => ($isDragging ? "none" : "background-color 0.2s ease, transform 0.1s ease")};
  cursor: pointer;
  opacity: ${({ $isDragging }) => ($isDragging ? 0.95 : 1)};
  box-shadow: ${({ $isDragging }) => ($isDragging ? "0 8px 24px rgba(0,0,0,0.2)" : "none")};

  touch-action: pan-y;
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
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  height: 64px;
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  align-items: center;
  padding-right: 12px;
  visibility: ${({ $isVisible }) => ($isVisible ? "visible" : "hidden")};
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  transition: opacity 0.18s ease, visibility 0.18s ease;
  pointer-events: ${({ $isVisible }) => ($isVisible ? "auto" : "none")};
  z-index: 1;
`;

export const SwipeContainer = styled.div`
  position: relative;
  overflow: hidden;
  border-radius: 12px;
  margin-bottom: 12px;
`;

export const SwipeContent = styled.div`
  transform: translateX(${({ $offset }) => `${$offset}px`});
  transition: transform 0.2s ease;
  touch-action: pan-y;
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
