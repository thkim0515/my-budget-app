import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import styled from 'styled-components';

import Header from "../components/Header";
import { formatNumber, unformatNumber } from '../utils/numberFormat';
import { useCurrencyUnit } from '../hooks/useCurrencyUnit';
import { useBudgetDB } from '../hooks/useBudgetDB';

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
  padding-top: 96px;
  padding-bottom: 100px;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
`;

// ----------- 스타일 -----------
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

const UnitBtnRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;

const UnitBtn = styled.button`
  flex: 1;
  padding: 10px;
  background: #555;
  color: white;
  border: none;
  border-radius: 6px;
`;

const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
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
  flex: 5;
  flex-direction: column;
`;

const ColAmount = styled(Cell)`
  flex: 2;
  justify-content: flex-end;   /* 금액 오른쪽 정렬 */
`;

const ColUnit = styled(Cell)`
  flex: 1;
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

const AmountInputWrap = styled.div`
  position: relative;
  width: 100%;
`;

const ClearBtn = styled.button`
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

const SelectBox = styled.select`
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
`;

// ------------ Detail Page ------------
export default function DetailPage() {
  const { chapterId } = useParams();

  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');

  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editType, setEditType] = useState(null);

  const { unit } = useCurrencyUnit();

  const { db, getAll, getAllFromIndex, add, put, deleteItem } = useBudgetDB();

  // DB 로드 완료 후 기록 + 카테고리 로드
  useEffect(() => {
    if (db) {
      loadRecords();
      loadCategories();
    }
  }, [db]);

  const loadCategories = async () => {
    const rows = await getAll('categories');
    const list = rows.map(c => c.name);
    setCategories(list);

    if (!category && list.length > 0) {
      setCategory(list[0]);
    }
  };

  const loadRecords = async () => {
    const data = await getAllFromIndex('records', 'chapterId', Number(chapterId));
    setRecords(data);
  };

  const handleAmountChange = (e) => {
    const v = e.target.value.replace(/[^0-9.]/g, "");
    const fixed = v.replace(/(\..*)\./g, "$1");
    setAmount(fixed);
  };

  const applyUnit = (value) => {
    const raw = unformatNumber(amount);
    if (!raw) return;
    setAmount(formatNumber(raw * value));
  };

  // 저장 & 수정
  const saveRecord = async (type) => {
    if (!title || !amount) return;

    const recordData = {
      chapterId: Number(chapterId),
      title,
      amount: unformatNumber(amount),
      type,
      category,
      date,
      source: title,
      createdAt: new Date()
    };

    if (isEditing && editId) {
      await put('records', { ...recordData, id: editId });
      alert("수정되었습니다.");
      setIsEditing(false);
      setEditId(null);
    } else {
      await add('records', recordData);
    }

    setTitle('');
    setAmount('');
    if (categories.length > 0) setCategory(categories[0]);
    setDate(new Date().toISOString().split("T")[0]);
    loadRecords();
  };

  const startEdit = (record) => {
    setTitle(record.title);
    setAmount(formatNumber(record.amount));
    setCategory(record.category || (categories[0] || ""));
    setDate(record.date || new Date(record.createdAt).toISOString().split("T")[0]);
    setIsEditing(true);
    setEditId(record.id);
    setEditType(record.type);
    window.scrollTo(0, 0);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
    setTitle('');
    setAmount('');
    if (categories.length > 0) setCategory(categories[0]);
    setDate(new Date().toISOString().split("T")[0]);
  };

  const deleteRecord = async (id) => {
    const ok = window.confirm("정말 삭제하시겠습니까?");
    if (!ok) return;

    await deleteItem('records', id);

    if (isEditing && editId === id) {
      cancelEdit();
    }

    loadRecords();
  };

  const income = records.filter(r => r.type === 'income');
  const expense = records.filter(r => r.type === 'expense');

  const incomeSum = income.reduce((a, b) => a + b.amount, 0);
  const expenseSum = expense.reduce((a, b) => a + b.amount, 0);
  const balance = incomeSum - expenseSum;

  return (
    <PageWrap>
      <HeaderFix>
        <Header title="상세 보기" />
      </HeaderFix>

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

        <h2 style={{ margin: '20px 0' }}>
          {isEditing ? "내역 수정" : "입력"}
        </h2>

        <InputBox
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <SelectBox 
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </SelectBox>

        <InputBox
          placeholder="항목명"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />

        <AmountInputWrap>
          <InputBox
            placeholder="금액"
            value={amount}
            onChange={handleAmountChange}
            style={{ paddingRight: "40px" }}
          />
          {unformatNumber(amount) > 0 && (
            <ClearBtn onClick={() => setAmount('')}>×</ClearBtn>
          )}
        </AmountInputWrap>

        <UnitBtnRow>
          <UnitBtn onClick={() => applyUnit(10000)}>만</UnitBtn>
          <UnitBtn onClick={() => applyUnit(100000)}>십만</UnitBtn>
          <UnitBtn onClick={() => applyUnit(1000000)}>백만</UnitBtn>
        </UnitBtnRow>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {isEditing ? (
            <>
              <button 
                onClick={() => saveRecord(editType)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#28a745',
                  color: 'white'
                }}
              >
                수정 완료
              </button>
              <button 
                onClick={cancelEdit}
                style={{
                  flex: 0.5,
                  padding: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#6c757d',
                  color: 'white'
                }}
              >
                취소
              </button>
            </>
          ) : (
            <>
              <button 
                onClick={() => saveRecord('income')} 
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#1976d2',
                  color: 'white'
                }}
              >
                수입
              </button>
              <button 
                onClick={() => saveRecord('expense')} 
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: '#d9534f',
                  color: 'white'
                }}
              >
                지출
              </button>
            </>
          )}
        </div>

        <h3>수입 목록</h3>
        <List>
          {income.map(r => (
            <ListItem key={r.id} >
              <ColTitle onClick={() => startEdit(r)} style={{ cursor: 'pointer' }}>
                <span style={{ fontSize: '12px', color: '#888' }}>{r.category}</span>
                <span style={{ fontWeight: 'bold' }}>{r.title}</span>
              </ColTitle>

              <ColAmount>{formatNumber(r.amount)}</ColAmount>
              <ColUnit>{unit}</ColUnit>

              <DeleteCell>
                <DeleteBtn onClick={() => deleteRecord(r.id)}>삭제</DeleteBtn>
              </DeleteCell>
            </ListItem>
          ))}
        </List>

        <h3>지출 목록</h3>
        <List>
          {expense.map(r => (
            <ListItem key={r.id}>
              <ColTitle onClick={() => startEdit(r)} style={{ cursor: 'pointer' }}>
                <span style={{ fontSize: '12px', color: '#888' }}>{r.category}</span>
                <span style={{ fontWeight: 'bold' }}>{r.title}</span>
              </ColTitle>

              <ColAmount>{formatNumber(r.amount)}</ColAmount>
              <ColUnit>{unit}</ColUnit>

              <DeleteCell>
                <DeleteBtn onClick={() => deleteRecord(r.id)}>삭제</DeleteBtn>
              </DeleteCell>
            </ListItem>
          ))}
        </List>

      </Content>
    </PageWrap>
  );
}
