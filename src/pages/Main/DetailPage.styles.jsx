import styled from "styled-components";

export const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.bg};
`;

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

export const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-top: 96px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  &::-webkit-scrollbar { display: none; }
`;

export const SummaryBox = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 20px;
`;

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