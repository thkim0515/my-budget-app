import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { initDB } from '../db/indexedDB';
import styled from 'styled-components';

import Header from "../components/Header";
import { formatNumber, unformatNumber } from '../utils/numberFormat';
import { useCurrencyUnit } from '../hooks/useCurrencyUnit';

// ----------- Layout 구조 -----------
const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  color: ${({ theme }) => theme.text};
`;

const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;

  margin: 0 auto;
  width: 100%;
  max-width: 480px;

  z-index: 20;
`;


const Content = styled.div`
  flex: 1;
  overflow-y: auto;

  padding: 16px;
  padding-top: 96px;   /* 헤더 높이 대신 padding으로 해결 */
  padding-bottom: 100px;

  width: 100%;
  max-width: 480px;
  margin: 0 auto;
`;


// ----------- 스타일들 -----------
const SummaryBox = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 20px;
`;

const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 15px;
`;

const InputBox = styled.input`
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
`;

const Row = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;

const Btn = styled.button`
  flex: 1;
  padding: 10px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 6px;
`;

const ListItem = styled.li`
  display: flex;
  background: ${({ theme }) => theme.card};
  padding: 0;
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.border};
`;

const Cell = styled.div`
  padding: 12px;
  display: flex;
  align-items: center;
  border-right: 1px dashed ${({ theme }) => theme.border};

  &:last-child {
    border-right: none;
  }
`;

const ColTitle = styled(Cell)`
  flex: 3.5;
`;

const ColAmount = styled(Cell)`
  flex: 1.6;
  justify-content: flex-start;
`;

const ColUnit = styled(Cell)`
  flex: 0.8;
  justify-content: center;
`;

const DeleteCell = styled(Cell)`
  width: 60px;
  padding: 0;
  justify-content: center;
`;

const DeleteBtn = styled.button`
  width: 100%;
  height: 100%;
  background: #d9534f;
  border: none;
  color: white;
`;

// ------------ Detail Page ------------
export default function DetailPage() {
  const { chapterId } = useParams();
  const [records, setRecords] = useState([]);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');

  const { unit } = useCurrencyUnit();

  useEffect(() => {
    loadRecords();
  }, []);

  const loadRecords = async () => {
    const db = await initDB();
    const data = await db.getAllFromIndex('records', 'chapterId', Number(chapterId));
    setRecords(data);
  };

  const handleAmountChange = (e) => {
    const raw = unformatNumber(e.target.value);
    setAmount(formatNumber(raw));
  };

  const saveRecord = async (type) => {
    if (!title || !amount) return;

    const db = await initDB();
    await db.add('records', {
      chapterId: Number(chapterId),
      title,
      amount: unformatNumber(amount),
      type,
      createdAt: new Date()
    });

    setTitle('');
    setAmount('');

    loadRecords();
  };

  const deleteRecord = async (id) => {
    const db = await initDB();
    await db.delete('records', id);
    loadRecords();
  };

  const income = records.filter(r => r.type === 'income');
  const expense = records.filter(r => r.type === 'expense');

  const incomeSum = income.reduce((a, b) => a + b.amount, 0);
  const expenseSum = expense.reduce((a, b) => a + b.amount, 0);
  const balance = incomeSum - expenseSum;

  return (
    <PageWrap>

      {/* 고정 헤더 */}
      <HeaderFix>
        <Header title="상세 보기" />
      </HeaderFix>

      {/* 스크롤 콘텐츠 */}
      <Content>

        <SummaryBox>
          <SummaryRow>
            <span>총 수입</span>
            <span>{formatNumber(incomeSum)} {unit}</span>
          </SummaryRow>

          <SummaryRow>
            <span>총 지출</span>
            <span>{formatNumber(expenseSum)} {unit}</span>
          </SummaryRow>

          <SummaryRow style={{ fontWeight: 'bold' }}>
            <span>잔액</span>
            <span>{formatNumber(balance)} {unit}</span>
          </SummaryRow>
        </SummaryBox>

        <h2 style={{ margin: '20px 0' }}>입력</h2>

        <InputBox
          placeholder="항목명"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        <InputBox
          placeholder="금액"
          value={amount}
          onChange={handleAmountChange}
        />

        <Row>
          <Btn onClick={() => saveRecord('income')}>수입</Btn>
          <Btn onClick={() => saveRecord('expense')}>지출</Btn>
        </Row>

        <h3>수입 목록</h3>
        <ul>
          {income.map(r => (
            <ListItem key={r.id}>
              <ColTitle>{r.title}</ColTitle>
              <ColAmount>{formatNumber(r.amount)}</ColAmount>
              <ColUnit>{unit}</ColUnit>
              <DeleteCell>
                <DeleteBtn onClick={() => deleteRecord(r.id)}>삭제</DeleteBtn>
              </DeleteCell>
            </ListItem>
          ))}
        </ul>

        <h3>지출 목록</h3>
        <ul>
          {expense.map(r => (
            <ListItem key={r.id}>
              <ColTitle>{r.title}</ColTitle>
              <ColAmount>{formatNumber(r.amount)}</ColAmount>
              <ColUnit>{unit}</ColUnit>
              <DeleteCell>
                <DeleteBtn onClick={() => deleteRecord(r.id)}>삭제</DeleteBtn>
              </DeleteCell>
            </ListItem>
          ))}
        </ul>

      </Content>
    </PageWrap>
  );
}
