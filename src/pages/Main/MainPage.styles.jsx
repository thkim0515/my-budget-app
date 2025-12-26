import styled from "styled-components";

export const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.text};
`;

export const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  max-width: 480px;
  margin: 0 auto;
  z-index: 20;
`;

export const ListWrap = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-top: 100px;
  padding: 0 16px;
  padding-bottom: 160px;
`;


export const CreateBtn = styled.button`
  background: #1976d2;
  color: ${({ theme }) => theme.headerText};
  padding: 8px 14px;
  border-radius: 6px;

  border: 1px solid ${({ theme }) => theme.border};

  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
`;



export const ChapterItem = styled.div`
  display: flex;
  align-items: center;
  padding: 20px 16px;
  background: ${({ theme, $completed }) =>
    $completed ? theme.completedBg : theme.card};
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid
    ${({ theme, $completed }) =>
      $completed ? theme.completedBorder : theme.border};
  color: ${({ theme }) => theme.text};
  transition: background-color 0.25s ease, transform 0.15s ease;

  &:active {
    transform: scale(0.98);
    background: ${({ theme }) => theme.activeBg};
  }
`;

export const ChapterLink = styled.span`
  flex: 1;
  color: inherit;
`;

export const DeleteBtn = styled.button`
  background: #d9534f;
  color: white;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  margin-left: 8px;
`;

export const CompleteBtn = styled.button`
  background: #4caf50;
  color: white;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  margin-left: 8px;
  animation: slideIn 0.25s ease forwards;

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(10px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
`;
