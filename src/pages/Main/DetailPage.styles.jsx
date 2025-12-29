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

/* --- [추가] 토글 스위치 영역 --- */
export const ControlBar = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 10px;
  padding: 0 4px;
`;

export const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: ${({ theme }) => theme.text};
  cursor: pointer;
  user-select: none;
`;

export const ToggleSwitch = styled.div`
  position: relative;
  width: 40px;
  height: 22px;
  background-color: ${({ $isOn }) => ($isOn ? '#4CAF50' : '#ccc')};
  border-radius: 22px;
  transition: background-color 0.3s;
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $isOn }) => ($isOn ? '20px' : '2px')};
    width: 18px;
    height: 18px;
    background-color: white;
    border-radius: 50%;
    transition: left 0.3s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  }
`;
/* -------------------------------- */

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

/* 리스트 아이템 컨테이너 - [수정됨] 합산 모드($isAggregated) 스타일 추가 */
export const ListItem = styled.li`
  display: flex;
  /* 배경 우선순위: 합산모드 > 납부완료 > 기본 */
  background: ${({ theme, $isPaid, $isAggregated }) => {
    if ($isAggregated) return "#e3f2fd"; // 합산시 연한 파랑 (라이트모드 기준)
    if ($isPaid) return "#e0e0e0";
    return theme.card;
  }};
  
  /* 합산 모드일 때 글자색 조정 (다크모드 대응 등 필요시 수정 가능) */
  color: ${({ $isPaid, $isAggregated }) => 
    ($isAggregated ? "#1565c0" : $isPaid ? "#333" : "inherit")};

  padding: 0;
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
  
  /* 테두리 및 왼쪽 띠 설정 */
  border: 1px solid ${({ theme, $isAggregated }) => 
    $isAggregated ? "#90caf9" : theme.border};
  border-left: ${({ theme, $isAggregated }) =>
  $isAggregated
    ? "5px solid #2196F3"
    : `1px solid ${theme.border}`};

  transition: all 0.2s ease;
  
  /* 합산 항목은 클릭해도 수정 불가능하므로 커서 기본값 */
  cursor: ${({ $isAggregated }) => ($isAggregated ? "default" : "pointer")};
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

/* 항목 제목 칼럼 */
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
  cursor: pointer;
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
  
  /* ListItem 스타일 상속을 위해 기본 속성 추가 */
  display: flex;
  padding: 0;
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.border}; /* 왼쪽은 위에서 덮어씀 */
  cursor: pointer;
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