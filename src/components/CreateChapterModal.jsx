import { useState } from "react";
import styled from "styled-components";

const Backdrop = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
`;

const Box = styled.div`
  background: ${({ theme }) => theme.card};
  padding: 20px;
  border-radius: 12px;
  width: 85%;
  max-width: 360px;
  border: 1px solid ${({ theme }) => theme.border};
`;

const Title = styled.div`
  font-size: 18px;
  margin-bottom: 12px;
  text-align: center;
  color: ${({ theme }) => theme.text};
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
  margin-bottom: 16px;
`;

const BtnRow = styled.div`
  display: flex;
  gap: 10px;
`;

const Btn = styled.button`
  flex: 1;
  padding: 10px;
  border: none;
  border-radius: 6px;
  color: white;
  background: ${({ danger }) => danger ? "#d9534f" : "#1976d2"};
`;

export default function CreateChapterModal({ onClose, onSubmit }) {
  const [value, setValue] = useState("");

  return (
    <Backdrop>
      <Box>
        <Title>새 가계부 만들기</Title>

        <Input
          placeholder="제목 입력 (예: 1월)"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />

        <BtnRow>
          <Btn danger onClick={onClose}>취소</Btn>
          <Btn onClick={() => onSubmit(value)}>확인</Btn>
        </BtnRow>
      </Box>
    </Backdrop>
  );
}
