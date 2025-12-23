/* 통합 DetailPage.jsx */
import { useParams } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

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

/* 리스트 아이템 컨테이너 - 다크모드/납부완료 가시성 개선 */
const ListItem = styled.li`
  display: flex;
  background: ${({ theme, $isPaid }) => ($isPaid ? "#e0e0e0" : theme.card)};
  color: ${({ $isPaid }) => ($isPaid ? "#333" : "inherit")}; 
  padding: 0;
  border-radius: 10px;
  margin-bottom: 10px;
  overflow: hidden;
  border: 1px solid ${({ theme }) => theme.border};
  transition: background-color 0.2s ease;
  cursor: pointer;
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

/* 항목 제목 칼럼 - 상단: 카테고리 [날짜], 하단: 항목명 */
const ColTitle = styled(Cell)`
  flex: 5;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
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

/* 드래그 정렬을 위한 배열 재배치 함수 */
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

/* 상세 페이지 컴포넌트 시작 */
export default function DetailPage() {
  const { chapterId, date, id } = useParams();
  const isChapterMode = !!chapterId;
  const isDateMode = !!date;

  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chapter, setChapter] = useState(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [recordDate, setRecordDate] = useState(isDateMode ? date : new Date().toISOString().split("T")[0]);

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editType, setEditType] = useState(null);
  const [editRecord, setEditRecord] = useState(null);

  const { unit } = useCurrencyUnit();
  const { db, getAll, getAllFromIndex, add, put, deleteItem, get } = useBudgetDB();
  const contentRef = useRef(null);

  useEffect(() => {
    if (db) {
      loadRecords();
      loadCategories();
      if (isChapterMode) {
        db.get("chapters", Number(chapterId)).then(setChapter);
      }
    }
  }, [db, chapterId, date]);

  const loadRecords = async () => {
    let list = [];
    if (isChapterMode) {
      list = await getAllFromIndex("records", "chapterId", Number(chapterId));
    } else if (isDateMode) {
      const all = await getAll("records");
      list = all.filter((r) => String(r.date || r.createdAt).split("T")[0] === date);
    }
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setRecords(list);
  };

  const loadCategories = async () => {
    const rows = await getAll("categories");
    const list = rows.map((c) => c.name);
    setCategories(list);
    if (!category && list.length > 0) setCategory(list[0]);
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

  /* 레코드 저장 기능 - 날짜 기반 챕터 자동 이동/생성 로직 추가 */
  const saveRecord = async (type) => {
    if (!title || !amount) return;

    const recordAmount = unformatNumber(amount);
    const newChapterTitle = formatChapterTitle(recordDate);
    let targetChapterId = Number(chapterId);

    /* [신규 기능] 날짜 변경 시 챕터 이동/생성 로직 */
    if (isChapterMode && chapter && newChapterTitle !== chapter.title) {
      const allChapters = await getAll("chapters");
      const existingChapter = allChapters.find(c => c.title === newChapterTitle);

      if (existingChapter) {
        targetChapterId = existingChapter.chapterId;
      } else {
        // 해당 월의 챕터가 없으면 새로 생성
        targetChapterId = await add("chapters", {
          title: newChapterTitle,
          createdAt: new Date(recordDate),
          order: allChapters.length,
          isTemporary: false,
        });
      }
    }

    const recordData = {
      chapterId: targetChapterId, // 결정된 챕터 ID 사용
      title,
      amount: recordAmount,
      type,
      category,
      date: recordDate,
      source: title,
      isPaid: editRecord?.isPaid || false,
      createdAt: editRecord?.createdAt || new Date(),
      // 챕터가 유지되면 기존 순서, 바뀌면 마지막으로 보냄
      order: (editRecord && targetChapterId === Number(chapterId)) 
             ? editRecord.order 
             : records.filter(r => r.type === type).length,
    };

    if (isEditing && editId) {
      await put("records", { ...recordData, id: editId });
      cancelEdit();
    } else {
      await add("records", recordData);
    }

    // 임시 챕터였고 날짜가 현재 챕터 내라면 제목 확정
    if (isChapterMode && chapter && chapter.isTemporary && targetChapterId === Number(chapterId)) {
      const updatedChapter = { ...chapter, title: newChapterTitle, isTemporary: false };
      await put("chapters", updatedChapter);
      setChapter(updatedChapter);
    }

    setTitle("");
    setAmount("");
    loadRecords(); // 챕터가 바뀌었다면 현재 리스트에서 자동으로 사라짐
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditId(null);
    setEditRecord(null);
    setEditType(null);
    setTitle("");
    setAmount("");
    if (categories.length > 0) setCategory(categories[0]);
  };

  const togglePaymentStatus = async () => {
    if (!isEditing || !editId || !editRecord) return;
    const updatedRecord = { ...editRecord, isPaid: !editRecord.isPaid };
    await put("records", updatedRecord);
    cancelEdit();
    loadRecords();
  };

  const startEdit = (record) => {
    setEditId(record.id);
    setEditType(record.type);
    setEditRecord(record);
    setTitle(record.title);
    setAmount(formatNumber(record.amount));
    setCategory(record.category || categories[0] || "");
    setRecordDate(String(record.date || record.createdAt).split("T")[0]);
    setIsEditing(true);
    setTimeout(() => {
      if (contentRef.current) contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };

  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceList = records.filter(r => r.type === (source.droppableId === 'incomeList' ? 'income' : 'expense'));
    const destList = records.filter(r => r.type === (destination.droppableId === 'incomeList' ? 'income' : 'expense'));
    const newType = destination.droppableId === 'incomeList' ? 'income' : 'expense';

    if (source.droppableId === destination.droppableId) {
      const items = reorder(sourceList, source.index, destination.index);
      for (let i = 0; i < items.length; i++) await put("records", { ...items[i], order: i });
    } else {
      const sItems = [...sourceList];
      const dItems = [...destList];
      const [removed] = sItems.splice(source.index, 1);
      const movedItem = { ...removed, type: newType };
      dItems.splice(destination.index, 0, movedItem);
      for (let i = 0; i < sItems.length; i++) await put("records", { ...sItems[i], order: i });
      for (let i = 0; i < dItems.length; i++) await put("records", { ...dItems[i], order: i });
    }
    loadRecords();
  };

  useEffect(() => {
    if (!isDateMode || records.length === 0) return;
    const target = document.getElementById(`record-${id}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [records]);

  const deleteRecord = async (rid) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    await deleteItem("records", rid);
    loadRecords();
  };

  const incomeSum = records.filter(r => r.type === "income").reduce((a, b) => a + b.amount, 0);
  const expenseSum = records.filter(r => r.type === "expense").reduce((a, b) => a + b.amount, 0);

  return (
    <PageWrap>
      <HeaderFix>
        <Header title={isChapterMode ? (chapter?.isTemporary ? "내역 입력" : chapter?.title) : `${date} 상세 내역`} />
      </HeaderFix>

      <Content ref={contentRef}>
        <SummaryBox>
          <SummaryRow><span>총 수입</span><span>{formatNumber(incomeSum)} {unit}</span></SummaryRow>
          <SummaryRow><span>총 지출</span><span>{formatNumber(expenseSum)} {unit}</span></SummaryRow>
          <SummaryRow style={{ fontWeight: "bold" }}><span>잔액</span><span>{formatNumber(incomeSum - expenseSum)} {unit}</span></SummaryRow>
        </SummaryBox>

        <h2 style={{ margin: "20px 0" }}>{isEditing ? "내역 수정" : "입력"}</h2>
        <InputBox type="date" value={recordDate} onChange={(e) => setRecordDate(e.target.value)} />
        <SelectBox value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
        </SelectBox>
        <InputBox placeholder="항목명" value={title} onChange={(e) => setTitle(e.target.value)} />
        <AmountInputWrap>
          <InputBox placeholder="금액" value={amount} onChange={handleAmountChange} style={{ paddingRight: "40px" }} />
          {unformatNumber(amount) > 0 && <ClearBtn onClick={() => setAmount("")}>×</ClearBtn>}
        </AmountInputWrap>
        <UnitBtnRow><UnitBtn onClick={() => applyUnit(10000)}>만</UnitBtn><UnitBtn onClick={() => applyUnit(100000)}>십만</UnitBtn><UnitBtn onClick={() => applyUnit(1000000)}>백만</UnitBtn></UnitBtnRow>

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          {isEditing ? (
            <>
              <button onClick={() => saveRecord(editType)} style={{ flex: 1, padding: "12px", borderRadius: "6px", border: "none", background: "#28a745", color: "white" }}>수정 완료</button>
              <button onClick={togglePaymentStatus} style={{ flex: 1, padding: "12px", borderRadius: "6px", border: "none", background: editRecord?.isPaid ? "#e67e22" : "#17a2b8", color: "white" }}>{editRecord?.isPaid ? "납부 취소" : "납부 완료"}</button>
              <button onClick={cancelEdit} style={{ flex: 0.5, padding: "12px", borderRadius: "6px", border: "none", background: "#6c757d", color: "white" }}>취소</button>
            </>
          ) : (
            <>
              <button onClick={() => saveRecord("income")} style={{ flex: 1, padding: "12px", borderRadius: "6px", border: "none", background: "#1976d2", color: "white" }}>수입</button>
              <button onClick={() => saveRecord("expense")} style={{ flex: 1, padding: "12px", borderRadius: "6px", border: "none", background: "#d9534f", color: "white" }}>지출</button>
            </>
          )}
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <h3>수입 목록</h3>
          <Droppable droppableId="incomeList">
            {(provided) => (
              <List ref={provided.innerRef} {...provided.droppableProps}>
                {records.filter(r => r.type === "income").map((r, index) => (
                  <Draggable key={r.id} draggableId={String(r.id)} index={index}>
                    {(p, snapshot) => (
                      <ListItem
                        ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                        id={`record-${r.id}`} onClick={() => startEdit(r)} $isPaid={r.isPaid}
                        as={isDateMode && Number(id) === r.id ? HighlightItem : r.id === editId ? HighlightItem : "li"}
                        style={{ ...p.draggableProps.style, opacity: snapshot.isDragging ? 0.7 : 1 }}
                      >
                        <ColTitle>
                          <span style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>
                            {r.category} [{String(r.date || r.createdAt).split("T")[0]}]
                          </span>
                          <span style={{ fontWeight: "bold" }}>{r.title}</span>
                        </ColTitle>
                        <ColAmount>{formatNumber(r.amount)}</ColAmount>
                        <ColUnit>{unit}</ColUnit>
                        <DeleteCell><DeleteBtn onClick={(e) => { e.stopPropagation(); deleteRecord(r.id); }}>삭제</DeleteBtn></DeleteCell>
                      </ListItem>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </List>
            )}
          </Droppable>

          <h3 style={{ marginTop: "20px" }}>지출 목록</h3>
          <Droppable droppableId="expenseList">
            {(provided) => (
              <List ref={provided.innerRef} {...provided.droppableProps}>
                {records.filter(r => r.type === "expense").map((r, index) => (
                  <Draggable key={r.id} draggableId={String(r.id)} index={index}>
                    {(p, snapshot) => (
                      <ListItem
                        ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps}
                        id={`record-${r.id}`} onClick={() => startEdit(r)} $isPaid={r.isPaid}
                        as={isDateMode && Number(id) === r.id ? HighlightItem : r.id === editId ? HighlightItem : "li"}
                        style={{ ...p.draggableProps.style, opacity: snapshot.isDragging ? 0.7 : 1 }}
                      >
                        <ColTitle>
                          <span style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>
                            {r.category} [{String(r.date || r.createdAt).split("T")[0]}]
                          </span>
                          <span style={{ fontWeight: "bold" }}>{r.title}</span>
                        </ColTitle>
                        <ColAmount>{formatNumber(r.amount)}</ColAmount>
                        <ColUnit>{unit}</ColUnit>
                        <DeleteCell><DeleteBtn onClick={(e) => { e.stopPropagation(); deleteRecord(r.id); }}>삭제</DeleteBtn></DeleteCell>
                      </ListItem>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </List>
            )}
          </Droppable>
        </DragDropContext>
      </Content>
    </PageWrap>
  );
}