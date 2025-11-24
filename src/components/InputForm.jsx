import styled from 'styled-components';

const InputBox = styled.input`
  width: 100%;
  padding: 10px;
  margin-bottom: 14px;
  border: 1px solid #ccc;
  border-radius: 6px;
`;

const Row = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
`;

const Btn = styled.button`
  flex: 1;
  padding: 12px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 6px;
`;

export default function InputForm({
  chapterTitle,
  setChapterTitle,
  recordTitle,
  setRecordTitle,
  amount,
  setAmount,
  type,
  setType,
  onSave,
}) {
  return (
    <div>
      <InputBox
        placeholder="대제목 (예: 1월)"
        value={chapterTitle}
        onChange={e => setChapterTitle(e.target.value)}
      />

      <InputBox
        placeholder="항목명"
        value={recordTitle}
        onChange={e => setRecordTitle(e.target.value)}
      />

      <InputBox
        type="number"
        placeholder="금액"
        value={amount}
        onChange={e => setAmount(e.target.value)}
      />

      <Row>
        <Btn onClick={() => setType('income')}>수입</Btn>
        <Btn onClick={() => setType('expense')}>지출</Btn>
      </Row>

      <Btn onClick={onSave}>저장</Btn>
    </div>
  );
}
