import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import Header from "../../components/Header";
import { formatNumber, unformatNumber } from "../../utils/numberFormat";
import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import { useBudgetDB } from "../../hooks/useBudgetDB";

import * as S from "./DetailPage.styles"

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
  const [recordDate, setRecordDate] = useState(
    isDateMode ? date : new Date().toISOString().split("T")[0]
  );

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editType, setEditType] = useState(null);
  const [editRecord, setEditRecord] = useState(null);

  const { unit } = useCurrencyUnit();
  const { db, getAll, getAllFromIndex, add, put, deleteItem } = useBudgetDB();
  const contentRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!db) return;

    loadRecords();
    loadCategories();

    if (isChapterMode) {
      db.get("chapters", Number(chapterId)).then(setChapter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, chapterId, date]);

  const loadRecords = async () => {
    let list = [];
    if (isChapterMode) {
      list = await getAllFromIndex("records", "chapterId", Number(chapterId));
    } else if (isDateMode) {
      const all = await getAll("records");
      list = all.filter(
        (r) => String(r.date || r.createdAt).split("T")[0] === date
      );
    }
    list.sort((a, b) => {
      const da = new Date(a.date || a.createdAt);
      const db = new Date(b.date || b.createdAt);

      // 1차: 날짜 오름차순
      if (da.getTime() !== db.getTime()) {
        return da - db;
      }

      // 2차: 같은 날짜면 order
      return (a.order ?? 0) - (b.order ?? 0);
    });

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

  /**
   * 레코드 저장
   * - 날짜 변경 시 챕터 자동 이동/생성
   * - 챕터가 바뀌면 즉시 해당 챕터 상세로 navigate 해서 "바로 보이게" 처리
   * - 챕터가 안 바뀌면 setRecords로 즉시 반영 + loadRecords로 정렬/최종 동기화
   */
  const saveRecord = async (type) => {
    if (!title || !amount) return;

    const recordAmount = unformatNumber(amount);
    const newChapterTitle = formatChapterTitle(recordDate);

    const currentChapterId = isChapterMode ? Number(chapterId) : null;
    let targetChapterId = currentChapterId;
    let chapterChanged = false;

    // 챕터 모드에서, 날짜가 바뀌어서 타겟 챕터가 달라지는 경우 처리
    if (isChapterMode && chapter) {
      if (newChapterTitle !== chapter.title) {
        const allChapters = await getAll("chapters");
        const existingChapter = allChapters.find(
          (c) => c.title === newChapterTitle
        );

        if (existingChapter) {
          targetChapterId = existingChapter.chapterId;
        } else {
          targetChapterId = await add("chapters", {
            title: newChapterTitle,
            createdAt: new Date(recordDate),
            order: allChapters.length,
            isTemporary: false,
          });
        }

        chapterChanged = targetChapterId !== currentChapterId;
      } else {
        targetChapterId = currentChapterId;
      }
    }

    const recordDataBase = {
      chapterId: isChapterMode ? targetChapterId : undefined, // date 모드에서는 chapterId가 없을 수도 있으나, 구조상 있으면 유지해도 무방
      title,
      amount: recordAmount,
      type,
      category,
      date: recordDate,
      source: title,
      isPaid: editRecord?.isPaid || false,
      createdAt: editRecord?.createdAt || new Date(),
    };

    // order 계산: 같은 챕터/같은 타입 기준으로 마지막에 추가
    const nextOrder = records.filter((r) => r.type === type).length;

    // 수정
    if (isEditing && editId) {
      const updated = {
        ...recordDataBase,
        id: editId,
        // 같은 챕터로 유지되는 수정이면 기존 order 유지, 챕터/타입이 바뀌면 마지막으로
        order:
          !chapterChanged && editRecord?.type === type
            ? editRecord?.order ?? nextOrder
            : nextOrder,
        // 챕터 모드에서만 확실히 chapterId 강제
        ...(isChapterMode ? { chapterId: targetChapterId } : {}),
      };

      await put("records", updated);

      // 챕터가 바뀌면 즉시 이동 (현재 화면에서는 안 보이는 게 정상이라 이동이 정답)
      // if (isChapterMode && chapterChanged) {
      //   cancelEdit();
      //   navigate(`/detail/chapter/${targetChapterId}`, { replace: true });
      //   return;
      // }

      cancelEdit();
      await loadRecords();
      return;
    }

    // 신규
    const newRecord = {
      ...recordDataBase,
      order: nextOrder,
      ...(isChapterMode ? { chapterId: targetChapterId } : {}),
    };

    const newId = await add("records", newRecord);

    if (
      isChapterMode &&
      chapter &&
      records.length === 0
    ) {
      setTitle("");
      setAmount("");
      navigate(`/detail/chapter/${targetChapterId}`, { replace: true });
      return;
    }

    // 신규 생성인데 챕터가 바뀌면 즉시 이동
    // if (isChapterMode && chapterChanged) {
    //   setTitle("");
    //   setAmount("");
    //   navigate(`/detail/chapter/${targetChapterId}`, { replace: true });
    //   return;
    // }

    // 같은 화면에서 바로 보이도록 즉시 state 반영
    setRecords((prev) => {
      const appended = [...prev, { ...newRecord, id: newId }];
      appended.sort((a, b) => {
        const da = new Date(a.date || a.createdAt);
        const db = new Date(b.date || b.createdAt);

        if (da.getTime() !== db.getTime()) return da - db;
        return (a.order ?? 0) - (b.order ?? 0);
      });
      return appended;
    });

    // setRecords((prev) => {
    //   const appended = [...prev, { ...newRecord, id: newId }];
    //   appended.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    //   return appended;
    // });

    // 임시 챕터였고 날짜가 현재 챕터 내라면 제목 확정
    if (isChapterMode && chapter && chapter.isTemporary && targetChapterId === currentChapterId) {
      const updatedChapter = {
        ...chapter,
        title: newChapterTitle,
        isTemporary: false,
      };
      await put("chapters", updatedChapter);
      setChapter(updatedChapter);
    }

    setTitle("");
    setAmount("");
    await loadRecords();
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
      if (contentRef.current)
        contentRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
  };

  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    )
      return;

    const sourceList = records.filter(
      (r) => r.type === (source.droppableId === "incomeList" ? "income" : "expense")
    );
    const destList = records.filter(
      (r) => r.type === (destination.droppableId === "incomeList" ? "income" : "expense")
    );
    const newType = destination.droppableId === "incomeList" ? "income" : "expense";

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
  }, [records, isDateMode, id]);

  const deleteRecord = async (rid) => {
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    await deleteItem("records", rid);
    loadRecords();
  };

  const incomeSum = records
    .filter((r) => r.type === "income")
    .reduce((a, b) => a + b.amount, 0);
  const expenseSum = records
    .filter((r) => r.type === "expense")
    .reduce((a, b) => a + b.amount, 0);

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header
          title={
            isChapterMode
              ? chapter?.isTemporary
                ? "내역 입력"
                : chapter?.title
              : `${date} 상세 내역`
          }
        />
      </S.HeaderFix>

      <S.Content ref={contentRef}>
        <S.SummaryBox>
          <S.SummaryRow>
            <span>총 수입</span>
            <span>{formatNumber(incomeSum)} {unit}</span>
          </S.SummaryRow>
          <S.SummaryRow>
            <span>총 지출</span>
            <span>{formatNumber(expenseSum)} {unit}</span>
          </S.SummaryRow>
          <S.SummaryRow style={{ fontWeight: "bold" }}>
            <span>잔액</span>
            <span>{formatNumber(incomeSum - expenseSum)} {unit}</span>
          </S.SummaryRow>
        </S.SummaryBox>

        <h2 style={{ margin: "20px 0" }}>{isEditing ? "내역 수정" : "입력"}</h2>

        <S.InputBox
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
        />

        <S.SelectBox value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </S.SelectBox>

        <S.InputBox
          placeholder="항목명"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <S.AmountInputWrap>
          <S.InputBox
            placeholder="금액"
            value={amount}
            onChange={handleAmountChange}
            style={{ paddingRight: "40px" }}
          />
          {unformatNumber(amount) > 0 && (
            <S.ClearBtn onClick={() => setAmount("")}>×</S.ClearBtn>
          )}
        </S.AmountInputWrap>

        <S.UnitBtnRow>
          <S.UnitBtn onClick={() => applyUnit(10000)}>만</S.UnitBtn>
          <S.UnitBtn onClick={() => applyUnit(100000)}>십만</S.UnitBtn>
          <S.UnitBtn onClick={() => applyUnit(1000000)}>백만</S.UnitBtn>
        </S.UnitBtnRow>

        <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
          {isEditing ? (
            <>
              <S.ActionBtn $variant="confirm" onClick={() => saveRecord(editType)}>
                수정 완료
              </S.ActionBtn>

              <S.ActionBtn $variant="toggle" onClick={togglePaymentStatus}>
                {editRecord?.isPaid ? "납부 취소" : "납부 완료"}
              </S.ActionBtn>

              <S.ActionBtn $variant="cancel" $flex={0.5} onClick={cancelEdit}>
                취소
              </S.ActionBtn>
            </>
          ) : (
            <>
              <S.ActionBtn $variant="income" onClick={() => saveRecord("income")}>
                수입
              </S.ActionBtn>

              <S.ActionBtn $variant="expense" onClick={() => saveRecord("expense")}>
                지출
              </S.ActionBtn>
            </>
          )}
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <h3>수입 목록</h3>
          <Droppable droppableId="incomeList">
            {(provided) => (
              <S.List ref={provided.innerRef} {...provided.droppableProps}>
                {records.filter(r => r.type === "income").map((r, index) => (
                  <Draggable key={r.id} draggableId={String(r.id)} index={index}>
                    {(p, snapshot) => (
                      <S.ListItem
                        ref={p.innerRef}
                        {...p.draggableProps}
                        {...p.dragHandleProps}
                        onClick={() => startEdit(r)}
                        $isPaid={r.isPaid}
                        as={
                          isDateMode && Number(id) === r.id
                            ? S.HighlightItem
                            : r.id === editId
                            ? S.HighlightItem
                            : "li"
                        }
                        style={{
                          ...p.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.7 : 1,
                        }}
                      >
                        <S.ColTitle>
                          <span style={{ fontSize: 12, color: "#888" }}>
                            {r.category} [{String(r.date || r.createdAt).split("T")[0]}]
                          </span>
                          <span style={{ fontWeight: "bold" }}>{r.title}</span>
                        </S.ColTitle>

                        <S.ColAmount>{formatNumber(r.amount)}</S.ColAmount>
                        <S.ColUnit>{unit}</S.ColUnit>

                        <S.DeleteCell>
                          <S.DeleteBtn
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRecord(r.id);
                            }}
                          >
                            삭제
                          </S.DeleteBtn>
                        </S.DeleteCell>
                      </S.ListItem>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </S.List>
            )}
          </Droppable>

          <h3 style={{ marginTop: 20 }}>지출 목록</h3>
          <Droppable droppableId="expenseList">
            {(provided) => (
              <S.List ref={provided.innerRef} {...provided.droppableProps}>
                {records.filter(r => r.type === "expense").map((r, index) => (
                  <Draggable key={r.id} draggableId={String(r.id)} index={index}>
                    {(p, snapshot) => (
                      <S.ListItem
                        ref={p.innerRef}
                        {...p.draggableProps}
                        {...p.dragHandleProps}
                        onClick={() => startEdit(r)}
                        $isPaid={r.isPaid}
                        as={
                          isDateMode && Number(id) === r.id
                            ? S.HighlightItem
                            : r.id === editId
                            ? S.HighlightItem
                            : "li"
                        }
                        style={{
                          ...p.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.7 : 1,
                        }}
                      >
                        <S.ColTitle>
                          <span style={{ fontSize: 12, color: "#888" }}>
                            {r.category} [{String(r.date || r.createdAt).split("T")[0]}]
                          </span>
                          <span style={{ fontWeight: "bold" }}>{r.title}</span>
                        </S.ColTitle>

                        <S.ColAmount>{formatNumber(r.amount)}</S.ColAmount>
                        <S.ColUnit>{unit}</S.ColUnit>

                        <S.DeleteCell>
                          <S.DeleteBtn
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteRecord(r.id);
                            }}
                          >
                            삭제
                          </S.DeleteBtn>
                        </S.DeleteCell>
                      </S.ListItem>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </S.List>
            )}
          </Droppable>
        </DragDropContext>
      </S.Content>
    </S.PageWrap>
  );


}
