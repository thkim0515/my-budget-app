import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useMemo } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import Header from "../../components/UI/Header";
import { formatNumber, unformatNumber } from "../../utils/numberFormat";
import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import { useBudgetDB } from "../../hooks/useBudgetDB";

import * as S from "./DetailPage.styles";

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

/* 데이터 그룹화(모아보기) 헬퍼 함수 */
const groupRecordsByTitle = (list) => {
  const grouped = {};
  list.forEach((r) => {
    // 키 생성: 같은 제목이면 묶음
    const key = r.title;
    if (!grouped[key]) {
      grouped[key] = {
        ...r,
        count: 1,
        isAggregated: true,
        id: `grouped-${r.id}`, // 가상 ID
        originalId: r.id,
      };
    } else {
      grouped[key].amount += r.amount;
      grouped[key].count += 1;
      grouped[key].originalId = null;
    }
  });
  // 금액 내림차순 정렬
  return Object.values(grouped).sort((a, b) => b.amount - a.amount);
};

/* 상세 페이지 컴포넌트 시작 */
export default function DetailPage() {
  const { chapterId, date, id } = useParams();

  const isChapterMode = !!chapterId;
  const isDateMode = !!date;

  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chapter, setChapter] = useState(null);

  // [수정] 수입/지출 각각의 모아보기 상태 관리
  const [isIncomeGrouped, setIsIncomeGrouped] = useState(() => {
    return localStorage.getItem("isIncomeGrouped") === "true";
  });
  const [isExpenseGrouped, setIsExpenseGrouped] = useState(() => {
    return localStorage.getItem("isExpenseGrouped") === "true";
  });

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

  // 토글 상태 저장
  useEffect(() => {
    localStorage.setItem("isIncomeGrouped", isIncomeGrouped);
  }, [isIncomeGrouped]);

  useEffect(() => {
    localStorage.setItem("isExpenseGrouped", isExpenseGrouped);
  }, [isExpenseGrouped]);

  useEffect(() => {
    if (!db) return;

    loadRecords();
    loadCategories();

    if (isChapterMode) {
      db.get("chapters", Number(chapterId)).then((data) => {
        setChapter(data);
        
        // 챕터 모드일 때 해당 챕터의 월에 맞춰 날짜 자동 설정
        if (data && !isDateMode && !isEditing) {
          const chapterDate = new Date(data.createdAt);
          const today = new Date();
          
          const cYear = chapterDate.getFullYear();
          const cMonth = chapterDate.getMonth();
          const tYear = today.getFullYear();
          const tMonth = today.getMonth();

          // 만약 챕터의 년/월이 현재와 같다면 '오늘' 날짜로, 
          // 아니라면 해당 월의 '1일'로 설정
          if (cYear === tYear && cMonth === tMonth) {
            setRecordDate(today.toISOString().split("T")[0]);
          } else {
            const yyyy = cYear;
            const mm = String(cMonth + 1).padStart(2, "0");
            setRecordDate(`${yyyy}-${mm}-01`);
          }
        }
      });
    }
  }, [db, chapterId, date]);

  const loadRecords = async () => {
    if (!db) return;

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

      if (da.getTime() !== db.getTime()) {
        return da - db;
      }
      return (a.order ?? 0) - (b.order ?? 0);
    });

    setRecords(list);
  };

  const loadCategories = async () => {
    if (!db) return;

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
    if (!raw && raw !== 0) return; 

    const calculated = Math.round(raw * value);
    
    setAmount(formatNumber(calculated));
  };

  const saveRecord = async (type) => {
    if (!title || !amount) return;

    const recordAmount = unformatNumber(amount);
    const newChapterTitle = formatChapterTitle(recordDate);

    const currentChapterId = isChapterMode ? Number(chapterId) : null;
    let targetChapterId = currentChapterId;
    let chapterChanged = false;

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
      chapterId: isChapterMode ? targetChapterId : undefined,
      title,
      amount: recordAmount,
      type,
      category,
      date: recordDate,
      source: title,
      isPaid: editRecord?.isPaid || false,
      createdAt: editRecord?.createdAt || new Date(),
    };

    const nextOrder = records.filter((r) => r.type === type).length;

    if (isEditing && editId) {
      const updated = {
        ...recordDataBase,
        id: editId,
        order:
          !chapterChanged && editRecord?.type === type
            ? editRecord?.order ?? nextOrder
            : nextOrder,
        ...(isChapterMode ? { chapterId: targetChapterId } : {}),
      };

      await put("records", updated);

      cancelEdit();
      await loadRecords();
      return;
    }

    const newRecord = {
      ...recordDataBase,
      order: nextOrder,
      ...(isChapterMode ? { chapterId: targetChapterId } : {}),
    };

    const newId = await add("records", newRecord);

    if (isChapterMode && chapter && records.length === 0) {
      setTitle("");
      setAmount("");
      navigate(`/detail/chapter/${targetChapterId}`, { replace: true });
      return;
    }

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

    if (
      isChapterMode &&
      chapter &&
      chapter.isTemporary &&
      targetChapterId === currentChapterId
    ) {
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
    // 합산된 항목은 수정 불가
    if (record.isAggregated && record.count > 1) {
      alert("모아보기 상태에서는 개별 항목을 수정할 수 없습니다.");
      return;
    }

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

    // ★ [수정] 각 리스트별 모아보기 상태에 따라 드래그 금지
    const isIncomeSource = source.droppableId === "incomeList";
    const isExpenseSource = source.droppableId === "expenseList";

    if (isIncomeSource && isIncomeGrouped) return;
    if (isExpenseSource && isExpenseGrouped) return;

    const sourceList = records.filter(
      (r) => r.type === (isIncomeSource ? "income" : "expense")
    );
    const destList = records.filter(
      (r) => r.type === (destination.droppableId === "incomeList" ? "income" : "expense")
    );
    const newType = destination.droppableId === "incomeList" ? "income" : "expense";

    if (source.droppableId === destination.droppableId) {
      const items = reorder(sourceList, source.index, destination.index);
      for (let i = 0; i < items.length; i++)
        await put("records", { ...items[i], order: i });
    } else {
      const sItems = [...sourceList];
      const dItems = [...destList];
      const [removed] = sItems.splice(source.index, 1);
      const movedItem = { ...removed, type: newType };
      dItems.splice(destination.index, 0, movedItem);
      for (let i = 0; i < sItems.length; i++)
        await put("records", { ...sItems[i], order: i });
      for (let i = 0; i < dItems.length; i++)
        await put("records", { ...dItems[i], order: i });
    }
    loadRecords();
  };

  useEffect(() => {
    if (!isDateMode || records.length === 0) return;
    const target = document.getElementById(`record-${id}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [records, isDateMode, id]);

  const deleteRecord = async (rid, isAggregated) => {
    if (isAggregated) {
      alert("모아보기 상태에서는 삭제할 수 없습니다. 개별 보기로 전환해주세요.");
      return;
    }
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

  // 수입 리스트 가공
  const displayedIncomeList = useMemo(() => {
    const list = records.filter((r) => r.type === "income");
    if (!isIncomeGrouped) return list;
    return groupRecordsByTitle(list);
  }, [records, isIncomeGrouped]);

  // 지출 리스트 가공
  const displayedExpenseList = useMemo(() => {
    const list = records.filter((r) => r.type === "expense");
    if (!isExpenseGrouped) return list;
    return groupRecordsByTitle(list);
  }, [records, isExpenseGrouped]);

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
            <span>
              {formatNumber(incomeSum)} {unit}
            </span>
          </S.SummaryRow>
          <S.SummaryRow>
            <span>총 지출</span>
            <span>
              {formatNumber(expenseSum)} {unit}
            </span>
          </S.SummaryRow>
          <S.SummaryRow style={{ fontWeight: "bold" }}>
            <span>잔액</span>
            <span>
              {formatNumber(incomeSum - expenseSum)} {unit}
            </span>
          </S.SummaryRow>
        </S.SummaryBox>

        <h2 style={{ margin: "20px 0" }}>{isEditing ? "내역 수정" : "입력"}</h2>

        <S.InputBox
          type="date"
          value={recordDate}
          onChange={(e) => setRecordDate(e.target.value)}
        />

        <S.SelectBox
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
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
              <S.ActionBtn
                $variant="confirm"
                onClick={() => saveRecord(editType)}
              >
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
              <S.ActionBtn
                $variant="income"
                onClick={() => saveRecord("income")}
              >
                수입
              </S.ActionBtn>

              <S.ActionBtn
                $variant="expense"
                onClick={() => saveRecord("expense")}
              >
                지출
              </S.ActionBtn>
            </>
          )}
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          {/* 수입 목록 헤더 + 토글 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>수입 목록</h3>
            <S.ToggleLabel onClick={() => setIsIncomeGrouped(!isIncomeGrouped)}>
              <span>모아보기</span>
              <S.ToggleSwitch $isOn={isIncomeGrouped} />
            </S.ToggleLabel>
          </div>
          
          <Droppable droppableId="incomeList">
            {(provided) => (
              <S.List ref={provided.innerRef} {...provided.droppableProps}>
                {displayedIncomeList.map((r, index) => (
                    <Draggable
                      key={r.id}
                      draggableId={String(r.id)}
                      index={index}
                      // 모아보기 활성화 시 or 합산된 항목일 때 드래그 금지
                      isDragDisabled={isIncomeGrouped || (r.isAggregated && r.count > 1)}
                    >
                      {(p, snapshot) => (
                        <S.ListItem
                          ref={p.innerRef}
                          {...p.draggableProps}
                          {...p.dragHandleProps}
                          onClick={() => startEdit(r)}
                          $isPaid={r.isPaid}
                          $isAggregated={r.isAggregated && r.count > 1}
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
                              {r.category}{" "}
                              {r.isAggregated && r.count > 1 ? (
                                <span style={{ color: "#2196F3", fontWeight: "bold" }}>
                                  [{r.count}건 합산]
                                </span>
                              ) : (
                                `[${String(r.date || r.createdAt).split("T")[0]}]`
                              )}
                            </span>
                            <span style={{ fontWeight: "bold" }}>{r.title}</span>
                          </S.ColTitle>

                          <S.ColAmount>{formatNumber(r.amount)}</S.ColAmount>
                          <S.ColUnit>{unit}</S.ColUnit>

                          <S.DeleteCell>
                            {(!r.isAggregated || r.count === 1) && (
                              <S.DeleteBtn
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteRecord(r.id, r.isAggregated && r.count > 1);
                                }}
                              >
                                삭제
                              </S.DeleteBtn>
                            )}
                          </S.DeleteCell>
                        </S.ListItem>
                      )}
                    </Draggable>
                  ))}
                {provided.placeholder}
              </S.List>
            )}
          </Droppable>

          {/* 지출 목록 헤더 + 토글 */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, marginBottom: 10 }}>
            <h3 style={{ margin: 0 }}>지출 목록</h3>
            <S.ToggleLabel onClick={() => setIsExpenseGrouped(!isExpenseGrouped)}>
              <span>모아보기</span>
              <S.ToggleSwitch $isOn={isExpenseGrouped} />
            </S.ToggleLabel>
          </div>

          <Droppable droppableId="expenseList">
            {(provided) => (
              <S.List ref={provided.innerRef} {...provided.droppableProps}>
                {displayedExpenseList.map((r, index) => (
                    <Draggable
                      key={r.id}
                      draggableId={String(r.id)}
                      index={index}
                      // 모아보기 활성화 시 or 합산된 항목일 때 드래그 금지
                      isDragDisabled={isExpenseGrouped || (r.isAggregated && r.count > 1)}
                    >
                      {(p, snapshot) => (
                        <S.ListItem
                          ref={p.innerRef}
                          {...p.draggableProps}
                          {...p.dragHandleProps}
                          onClick={() => startEdit(r)}
                          $isPaid={r.isPaid}
                          $isAggregated={r.isAggregated && r.count > 1}
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
                              {r.category}{" "}
                              {r.isAggregated && r.count > 1 ? (
                                <span style={{ color: "#2196F3", fontWeight: "bold" }}>
                                  [{r.count}건 합산]
                                </span>
                              ) : (
                                `[${String(r.date || r.createdAt).split("T")[0]}]`
                              )}
                            </span>
                            <span style={{ fontWeight: "bold" }}>{r.title}</span>
                          </S.ColTitle>

                          <S.ColAmount>{formatNumber(r.amount)}</S.ColAmount>
                          <S.ColUnit>{unit}</S.ColUnit>

                          <S.DeleteCell>
                            {(!r.isAggregated || r.count === 1) && (
                              <S.DeleteBtn
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteRecord(r.id, r.isAggregated && r.count > 1);
                                }}
                              >
                                삭제
                              </S.DeleteBtn>
                            )}
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