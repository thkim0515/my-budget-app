import styled from "styled-components";

export const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${({ theme }) => theme.bg};
  color: ${({ theme }) => theme.text};
`;

export const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  width: 100%;
  max-width: 480px;
  z-index: 20;
`;

export const Content = styled.div`
  flex: 1;
  padding: 16px;
  padding-top: 80px;
  overflow-y: auto;
`;

export const SectionTitle = styled.h3`
  font-size: 15px;
  font-weight: 700;
  margin-top: 24px;
  margin-bottom: 12px;
  color: ${({ theme }) => theme.text};
`;

/* 인풋 박스와 버튼 높이 해결을 위한 Row */
export const InputRow = styled.div`
  display: flex;
  gap: 8px;
  align-items: stretch; /* 자식 요소들의 높이를 동일하게 맞춤 */
  height: 48px; /* 기준 높이 설정 */
  margin-bottom: 20px;
`;

export const InputBox = styled.input`
  flex: 1;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
  font-size: 14px;
  outline: none;
  &:focus {
    border-color: ${({ theme }) => theme.primary};
    box-shadow: 0 0 0 4px ${({ theme }) => theme.primarySoft};
  }
`;

export const AddBtn = styled.button`
  padding: 0 20px;
  background: ${({ theme }) => theme.gradientPrimary};
  color: white;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  &:active { transform: scale(0.97); }
`;

export const DefaultGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`;

export const DefaultTag = styled.div`
  padding: 10px 4px;
  text-align: center;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.text};
  opacity: 0.8;
`;

export const List = styled.ul`
  padding: 0;
  list-style: none;
`;

export const Item = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px;
  margin-bottom: 8px;
  background: ${({ theme }) => theme.card};
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.border};
  span {
    font-size: 14px;
    font-weight: 500;
  }
`;

export const DeleteBtn = styled.button`
  padding: 6px 12px;
  background: transparent;
  color: ${({ theme }) => theme.errorText};
  border: 1px solid ${({ theme }) => theme.errorText};
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

export const EmptyMsg = styled.p`
  text-align: center;
  color: ${({ theme }) => theme.mutedText};
  font-size: 13px;
  margin-top: 20px;
`;
