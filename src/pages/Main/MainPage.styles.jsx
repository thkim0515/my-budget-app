import styled from "styled-components";


export const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
`;

// 상단 헤더를 고정시키는 영역
export const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: 480px;
  z-index: 20;
`;

// 챕터 목록을 담는 스크롤 영역
export const ListWrap = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-top: 100px;
  padding: 0 16px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
`;

// 새 챕터 생성 버튼 스타일
export const CreateBtn = styled.button`
  background: #1976d2;
  color: white;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
`;

// 각 챕터 아이템 스타일
export const ChapterItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 16px;
  background: ${({ theme }) => theme.card};
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  transition: background 0.15s, transform 0.15s;

  &:active {
    background: rgba(0, 0, 0, 0.12);
    transform: scale(0.98);
  }

  cursor: pointer;
`;

// 챕터 제목 링크 스타일
export const ChapterLink = styled.span`
  flex: 1;
  text-decoration: none;
  color: ${({ theme }) => theme.text};
`;

// 삭제 버튼 스타일
export const DeleteBtn = styled.button`
  background: #d9534f;
  color: white;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  margin-left: 10px;
`;

// 빈 목록일 때 메시지를 감싸는 영역
export const EmptyWrap = styled.div`
  height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// 빈 목록 메시지 텍스트 스타일
export const EmptyMessage = styled.div`
  font-size: 18px;
  color: ${({ theme }) => theme.text};
  opacity: 0.7;
`;
