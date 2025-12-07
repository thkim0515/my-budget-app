/* 통합 DetailPage.jsx */
import { useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import styled from "styled-components";

import Header from "../components/Header";
import { formatNumber, unformatNumber } from "../utils/numberFormat";
import { useCurrencyUnit } from "../hooks/useCurrencyUnit";
import { useBudgetDB } from "../hooks/useBudgetDB";

/* 페이지 레이아웃 컨테이너 */
const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  color: ${({ theme }) => theme.text};
`;

/* 상단 헤더 고정 영역 */
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

/* 콘텐츠 스크롤 영역 */
const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-top: 96px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
`;

/* 요약 정보 박스 */
const SummaryBox = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  padding: 16px;
  border-radius: 10px;
  margin-bottom: 20px;
`;

/* 요약행 스타일 */
const SummaryRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
  font-size: 15px;
`;

/* 입력창 스타일 */
const InputBox = styled.input`
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
`;

/* 단위 버튼 행 */
const UnitBtnRow = styled.div`
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
`;

/* 단위 버튼 */
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

/* 리스트 아이템 컨테이너 */
const ListItem = styled.li`
  display: flex;
  background: ${({ theme }) => theme.card};
  padding: 0;
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.border};
`;

/* 셀 스타일 */
const Cell = styled.div`
  padding: 12px;
  display: flex;
  align-items: center;
  border-right: 1px dashed ${({ theme }) => theme.border};
  &:last-child {
    border-right: none;
  }
`;

/* 항목 제목 칼럼 */
const ColTitle = styled(Cell)`
  flex: 5;
  flex-direction: column;
`;

/* 금액 칼럼 */
const ColAmount = styled(Cell)`
  flex: 2;
  justify-content: flex-end;
`;

/* 단위 칼럼 */
const ColUnit = styled(Cell)`
  flex: 1;
  justify-content: center;
`;

/* 삭제 버튼 칼럼 */
const DeleteCell = styled(Cell)`
  width: 60px;
  padding: 0;
  justify-content: center;
`;

/* 삭제 버튼 */
const DeleteBtn = styled.button`
  width: 100%;
  height: 100%;
  background: #d9534f;
  border: none;
  color: white;
`;

/* 금액 입력창의 클리어 버튼 래퍼 */
const AmountInputWrap = styled.div`
  position: relative;
  width: 100%;
`;

/* 금액 클리어 버튼 */
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

/* 카테고리 선택 박스 */
const SelectBox = styled.select`
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
`;

const HighlightItem = styled.li`
  background: rgba(255, 215, 0, 0.18);
  border-left: 4px solid #f1c40f;
`;

/* 날짜를 기반으로 챕터 제목을 자동 생성하는 함수 */
const formatChapterTitle = (dateString) => {
  const d = new Date(dateString);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return `${year}년 ${month}월`;
};

/* 상세 페이지 컴포넌트 시작 */
export default function DetailPage() {
  /* URL 매개변수로 상태 모드를 판별 */
  const { chapterId, date, id } = useParams();

  const isChapterMode = !!chapterId;
  const isDateMode = !!date;

  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chapter, setChapter] = useState(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  /* 입력 날짜 초기값 설정 */
  const [recordDate, setRecordDate] = useState(isDateMode ? date : new Date().toISOString().split("T")[0]);

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editType, setEditType] = useState(null);
  const [editRecord, setEditRecord] = useState(null);

  const { unit } = useCurrencyUnit();

  /* 데이터베이스 훅 */
  const { db, getAll, getAllFromIndex, add, put, deleteItem, get } = useBudgetDB();
  const contentRef = useRef(null);

  /* 데이터베이스 준비 시 레코드와 카테고리 로드 */
  useEffect(() => {
    if (db) {
      loadRecords();
      loadCategories();
      if (isChapterMode) {
        db.get("chapters", Number(chapterId)).then(setChapter);
      }
    }
  }, [db, chapterId, date]);

  /* 조건에 따라 레코드를 로드 */
  const loadRecords = async () => {
    let list = [];

    if (isChapterMode) {
      list = await getAllFromIndex("records", "chapterId", Number(chapterId));
    } else if (isDateMode) {
      const all = await getAll("records");
      list = all.filter((r) => (r.date || r.createdAt).split("T")[0] === date);
    }

    setRecords(list);
  };

  /* 카테고리 목록 로드 */
  const loadCategories = async () => {
    const rows = await getAll("categories");
    const list = rows.map((c) => c.name);
    setCategories(list);

    if (!category && list.length > 0) setCategory(list[0]);
  };

  /* 금액 입력값 처리 */
  const handleAmountChange = (e) => {
    const v = e.target.value.replace(/[^0-9.]/g, "");
    const fixed = v.replace(/(\..*)\./g, "$1");
    setAmount(fixed);
  };

  /* 금액 단위 버튼 클릭 처리 */
  const applyUnit = (value) => {
    const raw = unformatNumber(amount);
    if (!raw) return;
    setAmount(formatNumber(raw * value));
  };

  /* 레코드 저장 기능 */
  const saveRecord = async (type) => {
    if (!title || !amount) return;

    const recordAmount = unformatNumber(amount);
    const chapterID = Number(chapterId);

    const recordData = {
      chapterId: chapterID,
      title,
      amount: recordAmount,
      type,
      category,
      date: recordDate,
      source: title,
      createdAt: editRecord?.createdAt || new Date(),
    };

    let isNewRecord = true;

    if (isEditing && editId) {
      await put("records", { ...recordData, id: editId });
      setIsEditing(false);
      setEditId(null);
      setEditRecord(null);
      isNewRecord = false;
    } else {
      await add("records", recordData);
    }

    /* 임시 챕터의 제목을 자동 생성해 갱신 */
    if (isNewRecord && isChapterMode && chapter && chapter.isTemporary) {
      const newTitle = formatChapterTitle(recordDate);
      const updatedChapter = {
        ...chapter,
        title: newTitle,
        isTemporary: false,
      };
      await put("chapters", updatedChapter);
      setChapter(updatedChapter);
    }

    setTitle("");
    setAmount("");
    if (categories.length > 0) setCategory(categories[0]);

    loadRecords();
  };

  /* 레코드 수정 시작 기능 */
  const startEdit = (record) => {
    setEditId(record.id);
    setEditType(record.type);
    setEditRecord(record);

    setTitle(record.title);
    setAmount(formatNumber(record.amount));
    setCategory(record.category || categories[0] || "");
    setRecordDate((record.date || record.createdAt).split("T")[0]);

    setIsEditing(true);

    setTimeout(() => {
      if (contentRef.current) {
        contentRef.current.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    }, 0);
  };

  /* 날짜모드에서 특정 레코드로 자동 스크롤 */
  useEffect(() => {
    if (!isDateMode) return;
    if (records.length === 0) return;

    const target = document.getElementById(`record-${id}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [records]);

  /* 레코드 삭제 기능 */
  const deleteRecord = async (rid) => {
    const ok = window.confirm("정말 삭제하시겠습니까?");
    if (!ok) return;
    await deleteItem("records", rid);
    loadRecords();
  };

  /* 집계 계산 */
  const income = records.filter((r) => r.type === "income");
  const expense = records.filter((r) => r.type === "expense");
  const incomeSum = income.reduce((a, b) => a + b.amount, 0);
  const expenseSum = expense.reduce((a, b) => a + b.amount, 0);
  const balance = incomeSum - expenseSum;

  /* 헤더 제목 결정 */
  let headerTitle;
  if (isChapterMode) {
    headerTitle = chapter ? (chapter.isTemporary ? "내역 입력" : chapter.title) : "로딩 중";
  } else if (isDateMode) {
    headerTitle = `${date} 상세 내역`;
  }

  return (
    <PageWrap>
      <HeaderFix>
        <Header title={headerTitle} />
      </HeaderFix>

      <Content ref={contentRef}>
        <SummaryBox>
          <SummaryRow>
            <span>총 수입</span>
            <span>
              {formatNumber(incomeSum)} {unit}
            </span>
          </SummaryRow>
          <SummaryRow>
            <span>총 지출</span>
            <span>
              {formatNumber(expenseSum)} {unit}
            </span>
          </SummaryRow>
          <SummaryRow style={{ fontWeight: "bold" }}>
            <span>잔액</span>
            <span>
              {formatNumber(balance)} {unit}
            </span>
          </SummaryRow>
        </SummaryBox>

        <h2 style={{ margin: "20px 0" }}>{isEditing ? "내역 수정" : "입력"}</h2>

        <InputBox type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />

        <SelectBox value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </SelectBox>

        <InputBox placeholder="항목명" value={title} onChange={(e) => setTitle(e.target.value)} />

        <AmountInputWrap>
          <InputBox placeholder="금액" value={amount} onChange={handleAmountChange} style={{ paddingRight: "40px" }} />
          {unformatNumber(amount) > 0 && <ClearBtn onClick={() => setAmount("")}>×</ClearBtn>}
        </AmountInputWrap>

        <UnitBtnRow>
          <UnitBtn onClick={() => applyUnit(10000)}>만</UnitBtn>
          <UnitBtn onClick={() => applyUnit(100000)}>십만</UnitBtn>
          <UnitBtn onClick={() => applyUnit(1000000)}>백만</UnitBtn>
        </UnitBtnRow>

        <div
          style={{
            display: "flex",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          {isEditing ? (
            <>
              <button
                onClick={() => saveRecord(editType)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#28a745",
                  color: "white",
                }}
              >
                수정 완료
              </button>

              <button
                onClick={() => setIsEditing(false)}
                style={{
                  flex: 0.5,
                  padding: "12px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#6c757d",
                  color: "white",
                }}
              >
                취소
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => saveRecord("income")}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#1976d2",
                  color: "white",
                }}
              >
                수입
              </button>
              <button
                onClick={() => saveRecord("expense")}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "6px",
                  border: "none",
                  background: "#d9534f",
                  color: "white",
                }}
              >
                지출
              </button>
            </>
          )}
        </div>

        {/* 수입 목록 */}
        <h3>수입 목록</h3>
        <List>
          {income.map((r) => (
            <ListItem key={r.id} id={`record-${r.id}`} onClick={() => startEdit(r)} as={isDateMode && Number(id) === r.id ? HighlightItem : r.id === editId ? HighlightItem : "li"}>
              <ColTitle>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#888",
                  }}
                >
                  {r.category}
                </span>
                <span
                  style={{
                    fontWeight: "bold",
                  }}
                >
                  {r.title}
                </span>
              </ColTitle>
              <ColAmount>{formatNumber(r.amount)}</ColAmount>
              <ColUnit>{unit}</ColUnit>

              <DeleteCell>
                <DeleteBtn
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRecord(r.id);
                  }}
                >
                  삭제
                </DeleteBtn>
              </DeleteCell>
            </ListItem>
          ))}
        </List>

        {/* 지출 목록 */}
        <h3>지출 목록</h3>
        <List>
          {expense.map((r) => (
            <ListItem key={r.id} id={`record-${r.id}`} onClick={() => startEdit(r)} as={isDateMode && Number(id) === r.id ? HighlightItem : r.id === editId ? HighlightItem : "li"}>
              <ColTitle>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#888",
                  }}
                >
                  {r.category}
                </span>
                <span
                  style={{
                    fontWeight: "bold",
                  }}
                >
                  {r.title}
                </span>
              </ColTitle>
              <ColAmount>{formatNumber(r.amount)}</ColAmount>
              <ColUnit>{unit}</ColUnit>

              <DeleteCell>
                <DeleteBtn
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteRecord(r.id);
                  }}
                >
                  삭제
                </DeleteBtn>
              </DeleteCell>
            </ListItem>
          ))}
        </List>
      </Content>
    </PageWrap>
  );
}
