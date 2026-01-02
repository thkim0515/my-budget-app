import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";

import Header from "../../components/UI/Header";
import { formatNumber, unformatNumber } from "../../utils/numberFormat";
import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { useSettings } from "../../context/SettingsContext";
import { useSync } from "../../hooks/useSync";
import { DEFAULT_CATEGORIES } from "../../constants/categories";

import RecordForm from "../../components/RecordForm";
import RecordList from "../../components/RecordList";

import { auth } from "../../db/firebase";
import * as S from "./DetailPage.styles";

/* 한국 시간(KST) 기준 오늘 날짜 문자열(YYYY-MM-DD) 반환 헬퍼 */
const getTodayKST = () => {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });
};

/* 날짜 안전 변환 함수 (Timestamp 대응) */
const formatDateSafe = (dateValue) => {
  if (!dateValue) return new Date();
  if (dateValue.toDate) return dateValue.toDate();
  return new Date(dateValue);
};

/* 날짜를 기반으로 챕터 제목을 자동 생성하는 함수 */
const formatChapterTitle = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
};

/* 드래그 정렬을 위한 배열 재배치 함수 */
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

// [모아보기 헬퍼 함수]
const groupRecordsByTitle = (list) => {
  const grouped = {};
  list.forEach((r) => {
    const key = r.title;
    if (!grouped[key]) {
      grouped[key] = {
        ...r,
        count: 1,
        isAggregated: true,
        id: `grouped-${r.id}`,
        originalId: r.id,
      };
    } else {
      grouped[key].amount += r.amount;
      grouped[key].count += 1;
      grouped[key].originalId = null;
    }
  });
  return Object.values(grouped).sort((a, b) => b.amount - a.amount);
};

export default function DetailPage() {
  const { chapterId, date, id: paramId } = useParams();
  const navigate = useNavigate();
  const contentRef = useRef(null);

  const isChapterMode = !!chapterId;
  const isDateMode = !!date;

  const { unit } = useCurrencyUnit();
  const { db, getAll, getAllFromIndex, add, put, deleteItem } = useBudgetDB();
  const { settings, updateSetting } = useSettings();
  const { syncWithFirestore, isSyncing } = useSync();

  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [chapter, setChapter] = useState(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0] || "식비");

  const [recordDate, setRecordDate] = useState(() => {
    if (isDateMode) return date;
    return getTodayKST();
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editType, setEditType] = useState(null);
  const [editRecord, setEditRecord] = useState(null);

  // [요구사항 5] 접어두기 상태 (로컬스토리지 연동 - 월에 상관없이 전역 적용)
  const [collapsedState, setCollapsedState] = useState(() => {
    const saved = localStorage.getItem("detail_sections_collapsed");
    return saved ? JSON.parse(saved) : { income: false, budget: false, expense: false };
  });

  // 접어두기 상태가 변할 때마다 로컬스토리지에 저장
  useEffect(() => {
    localStorage.setItem("detail_sections_collapsed", JSON.stringify(collapsedState));
  }, [collapsedState]);

  // 섹션 토글 핸들러
  const toggleSection = (section) => {
    setCollapsedState((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleRefresh = async () => {
    if (auth.currentUser) {
      await syncWithFirestore(auth.currentUser.uid);
    } else {
      alert("로그인이 필요한 기능입니다.");
    }
  };

  useEffect(() => {
    if (!db || !isChapterMode || !chapterId) return;
    const initChapterDate = async () => {
      const data = await db.get("chapters", chapterId);
      if (data && !isDateMode) {
        const chapterDate = formatDateSafe(data.createdAt);
        const todayKST = getTodayKST();
        const [tYear, tMonth] = todayKST.split("-").map(Number);
        const cYear = chapterDate.getFullYear();
        const cMonth = chapterDate.getMonth() + 1;
        if (cYear === tYear && cMonth === tMonth) {
          setRecordDate(todayKST);
        } else {
          const mm = String(cMonth).padStart(2, "0");
          setRecordDate(`${cYear}-${mm}-01`);
        }
      }
    };
    initChapterDate();
  }, [db, isChapterMode, chapterId, isDateMode]);

  const loadData = useCallback(async () => {
    if (!db) return;
    let list = [];
    if (isChapterMode) {
      list = await getAllFromIndex("records", "chapterId", chapterId);
    } else if (isDateMode) {
      const all = await getAll("records");
      list = all.filter((r) => String(r.date || r.createdAt).split("T")[0] === date);
    }
    list.sort((a, b) => {
      const da = formatDateSafe(a.date || a.createdAt);
      const dbDate = formatDateSafe(b.date || b.createdAt);
      if (da.getTime() !== dbDate.getTime()) return da - dbDate;
      return (a.order ?? 0) - (b.order ?? 0);
    });
    setRecords(list);
    if (isChapterMode) {
      const data = await db.get("chapters", chapterId);
      setChapter(data);
    }
    const customCats = await getAll("categories");
    const activeCustomNames = customCats.filter((c) => !c.isDeleted).map((c) => c.name);
    const mergedCategories = [...new Set([...DEFAULT_CATEGORIES, ...activeCustomNames])];
    setCategories(mergedCategories);
  }, [db, chapterId, date, isChapterMode, isDateMode, getAll, getAllFromIndex]);

  useEffect(() => {
    loadData();
    const handleSyncUpdate = () => loadData();
    window.addEventListener("budget-db-updated", handleSyncUpdate);
    return () => window.removeEventListener("budget-db-updated", handleSyncUpdate);
  }, [loadData]);

  useEffect(() => {
    if (!isDateMode || records.length === 0) return;
    const target = document.getElementById(`record-${paramId}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [records, isDateMode, paramId]);

  // [요구사항 1] 합산 로직 세분화
  const incomeSum = useMemo(() => {
    return records.filter((r) => r.type === "income").reduce((a, b) => a + b.amount, 0);
  }, [records]);

  const budgetSum = useMemo(() => {
    // 예산: 수동으로 입력한 지출 (manual)
    return records.filter((r) => r.type === "expense" && r.inputMode === "manual").reduce((a, b) => a + b.amount, 0);
  }, [records]);

  const autoExpenseSum = useMemo(() => {
    // 지출: 자동으로 기록된 지출 (auto)
    return records.filter((r) => r.type === "expense" && (r.inputMode === "auto" || !r.inputMode)).reduce((a, b) => a + b.amount, 0);
  }, [records]);

  const incomeList = useMemo(() => {
    const list = records.filter((r) => r.type === "income");
    return settings.isIncomeGrouped ? groupRecordsByTitle(list) : list;
  }, [records, settings.isIncomeGrouped]);

  const budgetList = useMemo(() => {
    return records.filter((r) => r.type === "expense" && r.inputMode === "manual");
  }, [records]);

  const autoExpenseList = useMemo(() => {
    const list = records.filter((r) => r.type === "expense" && (r.inputMode === "auto" || !r.inputMode));
    return settings.isExpenseGrouped ? groupRecordsByTitle(list) : list;
  }, [records, settings.isExpenseGrouped]);

  const saveRecord = async (type) => {
    if (!title || !amount) return;
    const recordAmount = unformatNumber(amount);
    const newChapterTitle = formatChapterTitle(recordDate);
    const currentChapterId = isChapterMode ? chapterId : null;
    let targetChapterId = currentChapterId;
    let chapterChanged = false;

    if (isChapterMode && chapter) {
      if (newChapterTitle !== chapter.title) {
        const allChapters = await getAll("chapters");
        const existingChapter = allChapters.find((c) => c.title === newChapterTitle);
        if (existingChapter) {
          targetChapterId = existingChapter.chapterId;
        } else {
          targetChapterId = await add("chapters", {
            chapterId: `ch_${Date.now()}`,
            title: newChapterTitle,
            createdAt: new Date(recordDate),
            order: allChapters.length,
            isTemporary: false,
            updatedAt: Date.now(),
          });
        }
        chapterChanged = targetChapterId !== currentChapterId;
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
      updatedAt: Date.now(),
      inputMode: isEditing ? editRecord?.inputMode || "manual" : "manual",
    };

    if (isEditing && editId) {
      const updated = {
        ...recordDataBase,
        id: editId,
        order: !chapterChanged && editRecord?.type === type ? editRecord.order ?? 0 : records.filter((r) => r.type === type).length,
      };
      await put("records", updated);
      cancelEdit();
    } else {
      const nextOrder = records.filter((r) => r.type === type).length;
      await add("records", { ...recordDataBase, id: `rec_${Date.now()}`, order: nextOrder });
    }

    if (isChapterMode && chapter?.isTemporary && targetChapterId === currentChapterId) {
      const updatedChapter = { ...chapter, title: newChapterTitle, isTemporary: false, updatedAt: Date.now() };
      await put("chapters", updatedChapter);
      setChapter(updatedChapter);
    }

    setTitle("");
    setAmount("");
    await loadData();
    window.dispatchEvent(new CustomEvent("budget-db-updated"));
    if (isChapterMode && records.length === 0) {
      navigate(`/detail/chapter/${targetChapterId}`, { replace: true });
    }
  };

  const startEdit = (record) => {
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
    const safeDate = formatDateSafe(record.date || record.createdAt);
    setRecordDate(`${safeDate.getFullYear()}-${String(safeDate.getMonth() + 1).padStart(2, "0")}-${String(safeDate.getDate()).padStart(2, "0")}`);
    setIsEditing(true);
    setTimeout(() => contentRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 0);
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
    const updatedRecord = { ...editRecord, isPaid: !editRecord.isPaid, updatedAt: Date.now() };
    await put("records", updatedRecord);
    cancelEdit();
    loadData();
    window.dispatchEvent(new CustomEvent("budget-db-updated"));
  };

  const deleteRecord = async (rid, isAggregated) => {
    if (isAggregated) {
      alert("모아보기 상태에서는 삭제할 수 없습니다.");
      return;
    }
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    const target = records.find((r) => r.id === rid);
    if (target) {
      await put("records", { ...target, isDeleted: true, updatedAt: Date.now() });
    } else {
      await deleteItem("records", rid);
    }
    loadData();
    window.dispatchEvent(new CustomEvent("budget-db-updated"));
  };

  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const getListByDroppable = (id) => {
      if (id === "incomeList") return incomeList;
      if (id === "budgetList") return budgetList;
      return autoExpenseList;
    };

    const sourceList = getListByDroppable(source.droppableId);
    const destList = getListByDroppable(destination.droppableId);

    if (source.droppableId === destination.droppableId) {
      const items = reorder(sourceList, source.index, destination.index);
      for (let i = 0; i < items.length; i++) {
        await put("records", { ...items[i], order: i, updatedAt: Date.now() });
      }
    } else {
      const sItems = [...sourceList];
      const dItems = [...destList];
      const [removed] = sItems.splice(source.index, 1);
      const newType = destination.droppableId === "incomeList" ? "income" : "expense";
      const newMode = destination.droppableId === "budgetList" ? "manual" : "auto";
      const movedItem = { ...removed, type: newType, inputMode: newMode, updatedAt: Date.now() };
      dItems.splice(destination.index, 0, movedItem);
      for (let i = 0; i < sItems.length; i++) await put("records", { ...sItems[i], order: i, updatedAt: Date.now() });
      for (let i = 0; i < dItems.length; i++) await put("records", { ...dItems[i], order: i, updatedAt: Date.now() });
    }
    loadData();
    window.dispatchEvent(new CustomEvent("budget-db-updated"));
  };

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header
          title={isChapterMode ? (chapter?.isTemporary ? "내역 입력" : chapter?.title) : `${date} 상세 내역`}
          rightElement={
            <button onClick={handleRefresh} disabled={isSyncing} style={{ background: "none", border: "none", color: "white", fontSize: "14px", cursor: "pointer", opacity: isSyncing ? 0.5 : 1 }}>
              {isSyncing ? "동기화 중..." : "새로고침"}
            </button>
          }
        />
      </S.HeaderFix>

      <S.Content ref={contentRef}>
        {/* [요구사항 1] 요약 박스 세분화 (수입, 예산, 지출) */}
        <S.SummaryBox>
          <S.SummaryRow>
            <span>총 수입</span>
            <span>
              {formatNumber(incomeSum)} {unit}
            </span>
          </S.SummaryRow>
          <S.SummaryRow>
            <span>총 예산</span>
            <span>
              {formatNumber(budgetSum)} {unit}
            </span>
          </S.SummaryRow>
          <S.SummaryRow>
            <span>총 지출</span>
            <span>
              {formatNumber(autoExpenseSum)} {unit}
            </span>
          </S.SummaryRow>
          <S.SummaryRow style={{ fontWeight: "bold" }}>
            <span>잔액</span>
            <span>
              {formatNumber(incomeSum - (budgetSum + autoExpenseSum))} {unit}
            </span>
          </S.SummaryRow>
        </S.SummaryBox>

        <RecordForm
          isEditing={isEditing}
          editRecord={editRecord}
          editType={editType}
          title={title}
          amount={amount}
          category={category}
          categories={categories}
          recordDate={recordDate}
          setTitle={setTitle}
          setAmount={setAmount}
          setCategory={setCategory}
          setRecordDate={setRecordDate}
          onSave={saveRecord}
          onCancel={cancelEdit}
          onTogglePaid={togglePaymentStatus}
        />

        {/* [요구사항 5] 접어두기 상태 및 함수 전달 */}
        <RecordList
          incomeList={incomeList}
          budgetList={budgetList}
          expenseList={autoExpenseList}
          settings={settings}
          editId={editId}
          unit={unit}
          collapsedState={collapsedState} // 전달
          onToggleSection={toggleSection} // 전달
          onToggleIncomeGroup={() => updateSetting("isIncomeGrouped", !settings.isIncomeGrouped)}
          onToggleExpenseGroup={() => updateSetting("isExpenseGrouped", !settings.isExpenseGrouped)}
          onDragEnd={onDragEnd}
          onEdit={startEdit}
          onDelete={deleteRecord}
          onRefresh={handleRefresh}
        />
      </S.Content>
    </S.PageWrap>
  );
}
