import styled from "styled-components";

export const InputBox = styled.input`
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
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

export const UnitBtnRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;

export const UnitBtn = styled.button`
  flex: 1;
  padding: 10px;
  background: #555;
  color: white;
  border: none;
  border-radius: 6px;
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
      case "income": return "#1976d2";
      case "expense": return "#d9534f";
      case "confirm": return "#28a745";
      case "toggle": return "#17a2b8";
      case "cancel": return "#6c757d";
      default: return "#555";
    }
  }};
`;