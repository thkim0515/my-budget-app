import styled from "styled-components";

export const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
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

export const Content = styled.div`
  flex: 1;
  padding: 16px;
  padding-top: 100px;
  color: ${({ theme }) => theme.text};
`;

export const Section = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 12px;
  background: ${({ theme }) => theme.card};
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.border};
`;

export const Label = styled.span`
  font-size: 16px;
`;

export const ColorInput = styled.input`
  width: 50px;
  height: 40px;
  border: none;
  background: none;
  cursor: pointer;
`;

export const ResetBtn = styled.button`
  width: 100%;
  padding: 12px;
  margin-top: 20px;
  background: transparent;
  color: #d9534f;
  border: 1px solid #d9534f;
  border-radius: 8px;
  font-weight: bold;
`;