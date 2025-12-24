import styled from "styled-components";

/* 페이지 레이아웃 컨테이너 */
export const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  color: ${({ theme }) => theme.text};
`;

/* 상단 헤더 고정 영역 */
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

/* 콘텐츠 스크롤 영역 */
export const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-top: 96px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
`;

/* 요약 정보 박스 */
export const SummaryBox = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 20px;
`;

/* 요약행 스타일 */
export const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 15px;
`;

/* 입력창 스타일 */
export const InputBox = styled.input`
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
`;

/* 단위 버튼 행 */
export const UnitBtnRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;

/* 단위 버튼 */
export const UnitBtn = styled.button`
  flex: 1;
  padding: 10px;
  background: #555;
  color: white;
  border: none;
  border-radius: 6px;
`;

export const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

/* 리스트 아이템 컨테이너 - 다크모드/납부완료 가시성 개선 */
export const ListItem = styled.li`
  display: flex;
  background: ${({ theme, $isPaid }) => ($isPaid ? "#e0e0e0" : theme.card)};
  color: ${({ $isPaid }) => ($isPaid ? "#333" : "inherit")};
  padding: 0;
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.border};
  transition: background-color 0.2s ease;
  cursor: pointer;
`;

/* 셀 스타일 */
export const Cell = styled.div`
  padding: 12px;
  display: flex;
  align-items: center;
  border-right: 1px dashed ${({ theme }) => theme.border};
  &:last-child {
    border-right: none;
  }
`;

/* 항목 제목 칼럼 - 상단: 카테고리 [날짜], 하단: 항목명 */
export const ColTitle = styled(Cell)`
  flex: 5;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
`;

/* 금액 칼럼 */
export const ColAmount = styled(Cell)`
  flex: 2;
  justify-content: flex-end;
`;

/* 단위 칼럼 */
export const ColUnit = styled(Cell)`
  flex: 1;
  justify-content: center;
`;

/* 삭제 버튼 칼럼 */
export const DeleteCell = styled(Cell)`
  width: 60px;
  padding: 0;
  justify-content: center;
`;

/* 삭제 버튼 */
export const DeleteBtn = styled.button`
  width: 100%;
  height: 100%;
  background: #d9534f;
  border: none;
  color: white;
`;

/* 금액 입력창의 클리어 버튼 래퍼 */
export const AmountInputWrap = styled.div`
  position: relative;
  width: 100%;
`;

/* 금액 클리어 버튼 */
export const ClearBtn = styled.button`
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-75%);
  background: transparent;
  border: none;
  color: ${({ theme }) => theme.text};
  font-size: 18px;
  cursor: pointer;
`;

/* 카테고리 선택 박스 */
export const SelectBox = styled.select`
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
`;

export const HighlightItem = styled.li`
  background: rgba(255, 215, 0, 0.18);
  border-left: 4px solid #f1c40f;
`;

export const ActionBtn = styled.button`
  flex: ${({ $flex }) => $flex ?? 1};
  padding: 12px;
  border-radius: 6px;
  border: none;
  font-weight: bold;
  cursor: pointer;
  color: white;
  background: ${({ $variant }) => {
    switch ($variant) {
      case "income":
        return "#1976d2";
      case "expense":
        return "#d9534f";
      case "confirm":
        return "#28a745";
      case "toggle":
        return "#17a2b8";
      case "cancel":
        return "#6c757d";
      default:
        return "#555";
    }
  }};
`;
