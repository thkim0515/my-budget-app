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
  background-color: ${({ theme }) => theme.background};
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

  &::-webkit-scrollbar {
    display: none;
  }
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

  &:last-child {
    margin-bottom: 0;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px dashed ${({ theme }) => theme.border};
  }
`;

/* --- 토글 스위치 영역 --- */
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
  background-color: ${({ $isOn }) => ($isOn ? "#4CAF50" : "#ccc")};
  border-radius: 22px;
  transition: background-color 0.3s;
  flex-shrink: 0;

  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: ${({ $isOn }) => ($isOn ? "20px" : "2px")};
    width: 18px;
    height: 18px;
    background-color: white;
    border-radius: 50%;
    transition: left 0.3s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
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

/* [수정] 리스트 아이템 컨테이너: 배경색 강조 제거, 좌측 바만 유지 */
export const ListItem = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  margin-bottom: 12px;

  /* 배경색은 기본 카드 색상 고정 (편집 중일 때만 최소한의 강조) */
  background: ${({ theme, $isEditing }) => ($isEditing ? "rgba(255, 215, 0, 0.1)" : theme.card)};

  border-radius: 14px;
  border: 1px solid ${({ theme }) => theme.border};

  /* [중요] 좌측 표시선으로만 상태 구분 */
  border-left: ${({ $isPaid }) => ($isPaid ? "5px solid #2ecc71" : "1px solid transparent")};

  box-shadow: ${({ $isEditing }) => ($isEditing ? "0 0 0 2px #f1c40f" : "0 4px 12px rgba(0,0,0,0.05)")};

  /* 납부 완료 시 투명도만 살짝 조정하여 처리된 느낌 부여 */
  opacity: ${({ $isPaid }) => ($isPaid ? 0.85 : 1)};
  transition: all 0.2s ease;
  cursor: pointer;

  &:active {
    transform: scale(0.98);
  }
`;

export const CardInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
`;

export const CardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

/* 섹션 헤더 */
export const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 24px;
  margin-bottom: 12px;
  padding: 0 4px;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: bold;
    color: ${({ theme }) => theme.text};
  }
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const CollapseBtn = styled.button`
  background: none;
  border: 1px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.text};
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0.6;
  &:active {
    background: ${({ theme }) => theme.border};
  }
`;

/* 당겨서 새로고침 컨테이너 */
export const PullToRefreshContainer = styled.div`
  position: relative;
  overflow: hidden;
  user-select: none;
`;

export const RefreshIndicator = styled.div`
  position: absolute;
  top: -50px;
  left: 0;
  right: 0;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #888;
  transform: translateY(${({ $pullDistance }) => Math.min($pullDistance, 60)}px);
  transition: ${({ $isRefreshing }) => ($isRefreshing ? "none" : "transform 0.2s ease")};
  z-index: 10;
`;

export const RefreshContent = styled.div`
  transform: translateY(${({ $pullDistance }) => Math.min($pullDistance, 60)}px);
  transition: ${({ $isRefreshing, $pullDistance }) => ($isRefreshing || $pullDistance === 0 ? "transform 0.2s ease" : "none")};
`;

/* [수정] 모드별 테마가 적용된 PaidBadge */
export const PaidBadge = styled.span`
  background: ${({ theme }) => theme.paidBadgeBg};
  color: ${({ theme }) => theme.paidBadgeText};
  font-size: 10px;
  padding: 2px 7px;
  border-radius: 4px;
  font-weight: 700;
  margin-left: 8px;
  vertical-align: middle;
  display: inline-flex;
  align-items: center;
  border: 1px solid ${({ theme }) => (theme.paidBadgeText === "#6ee7b7" ? "rgba(110, 231, 183, 0.2)" : "rgba(5, 150, 105, 0.1)")};
`;

export const CardRight = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
`;

export const CardAmount = styled.div`
  font-size: 15px;
  font-weight: bold;
  white-space: nowrap;
`;

export const CardAction = styled.button`
  background: transparent;
  border: none;
  color: #d9534f;
  font-size: 18px;
  opacity: 0.8;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover {
    opacity: 1;
    transform: scale(1.1);
  }
`;

export const CardMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  opacity: 0.6;
`;

export const CategoryIconWrap = styled.div`
  font-size: 14px;
  opacity: 0.7;
  flex-shrink: 0;
`;

export const AmountInputWrap = styled.div`
  position: relative;
  width: 100%;
`;

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

export const SelectBox = styled.select`
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
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
