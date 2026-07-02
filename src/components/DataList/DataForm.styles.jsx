import styled from "styled-components";

export const FormTitle = styled.h2`
  margin: 0 0 18px;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.text};
`;

export const FieldLabel = styled.label`
  display: block;
  font-size: 12px;
  font-weight: 700;
  color: ${({ theme }) => theme.subText};
  margin: 0 0 6px 2px;
`;

export const InputBox = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  margin-bottom: 14px;
  border: 1.5px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.cardAlt};
  color: ${({ theme }) => theme.text};
  font-size: 16px;
  font-weight: 600;
  transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
  &::placeholder { color: ${({ theme }) => theme.mutedText}; font-weight: 500; }
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary};
    background: ${({ theme }) => theme.card};
    box-shadow: 0 0 0 4px ${({ theme }) => theme.primarySoft};
  }
`;

export const SelectBox = styled.select`
  width: 100%;
  box-sizing: border-box;
  padding: 14px 16px;
  margin-bottom: 14px;
  border: 1.5px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.cardAlt};
  color: ${({ theme }) => theme.text};
  font-size: 16px;
  font-weight: 600;
  appearance: none;
  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.primary};
    box-shadow: 0 0 0 4px ${({ theme }) => theme.primarySoft};
  }
`;

export const AmountInputWrap = styled.div`
  position: relative;
  width: 100%;
`;

export const ClearBtn = styled.button`
  position: absolute;
  right: 12px;
  top: 26px;
  transform: translateY(-50%);
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${({ theme }) => theme.bgElevated};
  border: none;
  border-radius: 50%;
  color: ${({ theme }) => theme.subText};
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  &:active { transform: translateY(-50%) scale(0.9); }
`;

export const UnitBtnRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 22px;
`;

export const UnitBtn = styled.button`
  flex: 1;
  padding: 11px;
  background: ${({ theme }) => theme.primarySoft};
  color: ${({ theme }) => theme.primaryText};
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
  transition: transform 0.1s;
  &:active { transform: scale(0.95); }
`;

export const DeleteBtn = styled.button`
  width: 100%;
  padding: 13px;
  margin-bottom: 4px;
  background: transparent;
  border: 1.5px solid ${({ theme }) => theme.expenseColor};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.expenseColor};
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

export const ActionRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 12px;
`;

export const ActionBtn = styled.button`
  flex: ${({ $flex }) => $flex ?? 1};
  padding: 15px;
  border-radius: ${({ theme }) => theme.radius.sm};
  border: none;
  font-weight: 800;
  font-size: 15px;
  cursor: pointer;
  color: #fff;
  transition: transform 0.1s, box-shadow 0.15s;
  background: ${({ $variant, theme }) => {
    switch ($variant) {
      case "income": return theme.gradientIncome;
      case "expense": return theme.gradientExpense;
      case "confirm": return theme.gradientPrimary;
      case "toggle": return theme.cardAlt;
      case "cancel": return theme.cardAlt;
      default: return theme.gradientPrimary;
    }
  }};
  color: ${({ $variant, theme }) =>
    $variant === "toggle" || $variant === "cancel" ? theme.subText : "#fff"};
  box-shadow: ${({ $variant, theme }) =>
    $variant === "toggle" || $variant === "cancel" ? "none" : theme.shadowSm};
  &:active { transform: scale(0.97); }
`;

/* 계산 제외 / 복사 버튼 행 (삭제 버튼 바로 위) */
export const SecondaryRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
`;

export const ExcludeToggleBtn = styled.button`
  flex: 1;
  padding: 13px;
  background: ${({ $on, theme }) => ($on ? theme.warningSoft : "transparent")};
  border: 1.5px solid ${({ $on, theme }) => ($on ? theme.warning : theme.border)};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ $on, theme }) => ($on ? theme.warning : theme.subText)};
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  &:active { opacity: 0.7; }
`;

export const CopyBtn = styled.button`
  flex: 1;
  padding: 13px;
  background: transparent;
  border: 1.5px solid ${({ theme }) => theme.primary};
  border-radius: ${({ theme }) => theme.radius.sm};
  color: ${({ theme }) => theme.primaryText};
  font-weight: 700;
  font-size: 13px;
  cursor: pointer;
  &:active { opacity: 0.7; }
`;
