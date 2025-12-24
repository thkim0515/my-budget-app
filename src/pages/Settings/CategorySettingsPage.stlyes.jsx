import styled from "styled-components";
// 페이지 전체 레이아웃
export const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
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

// 카테고리 입력창
export const InputBox = styled.input`
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
`;

// 등록 버튼
export const Btn = styled.button`
  width: 100%;
  padding: 12px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 6px;
  margin-bottom: 16px;
`;

// 기본 카테고리 보여주는 그리드
export const DefaultGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 20px;
`;

// 기본 카테고리 태그
export const DefaultTag = styled.div`
  width: 25%;
  padding: 10px;
  text-align: center;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  box-sizing: border-box;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
`;

// 추가 카테고리 리스트
export const List = styled.ul`
  margin-top: 16px;
  padding: 0;
  list-style: none;
`;

// 추가 카테고리 아이템
export const Item = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  margin-bottom: 10px;
  background: ${({ theme }) => theme.card};
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border};
`;

// 삭제 버튼
export const DeleteBtn = styled.button`
  padding: 6px 10px;
  background: #d9534f;
  color: white;
  border: none;
  border-radius: 4px;
`