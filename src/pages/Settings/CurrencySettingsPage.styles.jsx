import styled from "styled-components";

// 페이지 전체 레이아웃 컨테이너
export const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.text};
`;

// 상단 헤더 고정 영역
export const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  margin: 0 auto;
  max-width: 480px;
  z-index: 20;
`;

// 본문 스크롤 영역
export const Content = styled.div`
  flex: 1;
  padding: 16px;
  padding-top: 96px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
  overflow-y: auto;
`;

// 통화 단위 선택 드롭다운
export const SelectBox = styled.select`
  width: 100%;
  padding: 12px;
  margin-bottom: 20px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
`;

// 뒤로가기 버튼 스타일
export const BackBtn = styled.button`
  width: 100%;
  padding: 12px;
  background: #1976d2;
  color: ${({ theme }) => theme.textBright};
  border: none;
  border-radius: 6px;
`;

