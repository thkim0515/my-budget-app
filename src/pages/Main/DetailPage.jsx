import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import ReactDOM from "react-dom";

import Header from "../../components/UI/Header";
import { formatNumber, unformatNumber } from "../../utils/numberFormat";
import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { useSettings } from "../../context/SettingsContext";
import { DEFAULT_CATEGORIES } from "../../constants/categories";

import DataForm from "../../components/DataList/DataForm";
import DataList from "../../components/DataList/DataList";
import { pushBackHandler } from "../../utils/backHandlerStack";

import * as S from "./DetailPage.styles";

const getTodayKST = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Seoul" });

const formatDateSafe = (dateValue) => {
  if (!dateValue) return new Date();
  if (dateValue.toDate) return dateValue.toDate();
  return new Date(dateValue);
};

const formatChapterTitle = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "";
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
};

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

const groupRecordsByTitle = (list) => {
  const grouped = {};
  list.forEach((r) => {
    const key = r.title;
    if (!grouped[key]) {
      grouped[key] = { ...r, count: 1, isAggregated: true, id: `grouped-${r.id}`, originalId: r.id };
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

  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [chapter, setChapter] = useState(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0] || "식비");
  const [recordDate, setRecordDate] = useState(() => isDateMode ? date : getTodayKST());

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editType, setEditType] = useState(null);
  const [editRecord, setEditRecord] = useState(null);

  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // 바텀시트 아래로 스와이프(드래그)하여 닫기
  const sheetRef = useRef(null);
  const sheetDragStart = useRef(null);
  const sheetDragOffset = useRef(0);
  const [sheetDragY, setSheetDragY] = useState(0);
  // 하드웨어 뒤로가기에서 항상 최신 closeSheet를 호출하기 위한 ref
  const closeSheetRef = useRef(() => {});

  const [collapsedState, setCollapsedState] = useState(() => {
    const saved = localStorage.getItem("detail_sections_collapsed");
    return saved ? JSON.parse(saved) : { income: false, budget: false, expense: false };
  });

  useEffect(() => {
    localStorage.setItem("detail_sections_collapsed", JSON.stringify(collapsedState));
  }, [collapsedState]);

  // 납부완료 항목을 이 달의 합계 계산에서 제외할지 여부 (개별 항목의 계산 제외 토글과는 별개, 월 단위로 기억)
  const excludePaidStorageKey = `detail_exclude_paid_${chapterId || date || "default"}`;
  const [excludePaidFromCalc, setExcludePaidFromCalc] = useState(
    () => localStorage.getItem(excludePaidStorageKey) === "true"
  );

  useEffect(() => {
    setExcludePaidFromCalc(localStorage.getItem(excludePaidStorageKey) === "true");
  }, [excludePaidStorageKey]);

  useEffect(() => {
    localStorage.setItem(excludePaidStorageKey, String(excludePaidFromCalc));
  }, [excludePaidFromCalc, excludePaidStorageKey]);

  const toggleSection = (section) => {
    setCollapsedState((prev) => ({ ...prev, [section]: !prev[section] }));
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
          setRecordDate(`${cYear}-${String(cMonth).padStart(2, "0")}-01`);
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
      const db2 = formatDateSafe(b.date || b.createdAt);
      if (da.getTime() !== db2.getTime()) return da - db2;
      return (a.order ?? 0) - (b.order ?? 0);
    });
    setRecords(list);
    if (isChapterMode) {
      const data = await db.get("chapters", chapterId);
      setChapter(data);
    }
    const customCats = await getAll("categories");
    const activeCustomNames = customCats.filter((c) => !c.isDeleted).map((c) => c.name);
    setCategories([...new Set([...DEFAULT_CATEGORIES, ...activeCustomNames])]);
  }, [db, chapterId, date, isChapterMode, isDateMode, getAll, getAllFromIndex]);

  useEffect(() => {
    loadData();
    const handle = () => loadData();
    window.addEventListener("budget-db-updated", handle);
    return () => window.removeEventListener("budget-db-updated", handle);
  }, [loadData]);

  useEffect(() => {
    if (!isDateMode || records.length === 0) return;
    const target = document.getElementById(`record-${paramId}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [records, isDateMode, paramId]);

  // 계산에서 제외(excludedFromCalc) 처리된 항목은 합계에 반영하지 않는다. (목록에는 그대로 표시)
  // excludePaidFromCalc가 켜져 있으면 납부완료(isPaid) 항목도 이 달 합계에서 함께 제외한다.
  const isCountedInCalc = useCallback((r) =>
    !r.excludedFromCalc && !(excludePaidFromCalc && r.isPaid), [excludePaidFromCalc]);

  const incomeSum = useMemo(() =>
    records.filter((r) => r.type === "income" && isCountedInCalc(r)).reduce((a, b) => a + b.amount, 0), [records, isCountedInCalc]);

  const budgetSum = useMemo(() =>
    records.filter((r) => r.type === "expense" && r.inputMode === "manual" && isCountedInCalc(r)).reduce((a, b) => a + b.amount, 0), [records, isCountedInCalc]);

  const autoExpenseSum = useMemo(() =>
    records.filter((r) => r.type === "expense" && (r.inputMode === "auto" || !r.inputMode) && isCountedInCalc(r)).reduce((a, b) => a + b.amount, 0), [records, isCountedInCalc]);

  const excludedCount = useMemo(() =>
    records.filter((r) => r.excludedFromCalc).length, [records]);

  const incomeList = useMemo(() => {
    const list = records.filter((r) => r.type === "income");
    return settings.isIncomeGrouped ? groupRecordsByTitle(list) : list;
  }, [records, settings.isIncomeGrouped]);

  const budgetList = useMemo(() =>
    records.filter((r) => r.type === "expense" && r.inputMode === "manual"), [records]);

  const autoExpenseList = useMemo(() => {
    const list = records.filter((r) => r.type === "expense" && (r.inputMode === "auto" || !r.inputMode));
    return settings.isExpenseGrouped ? groupRecordsByTitle(list) : list;
  }, [records, settings.isExpenseGrouped]);

  const balance = incomeSum - (budgetSum + autoExpenseSum);

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
        order: !chapterChanged && editRecord?.type === type ? (editRecord.order ?? 0) : records.filter((r) => r.type === type).length,
      };
      await put("records", updated);
      closeSheet();
    } else {
      const nextOrder = records.filter((r) => r.type === type).length;
      await add("records", { ...recordDataBase, id: `rec_${Date.now()}`, order: nextOrder });
      setTitle("");
      setAmount("");
      // 새 항목 추가는 시트를 닫지 않고 계속 입력 가능하게
    }

    if (isChapterMode && chapter?.isTemporary && targetChapterId === currentChapterId) {
      const updatedChapter = { ...chapter, title: newChapterTitle, isTemporary: false, updatedAt: Date.now() };
      await put("chapters", updatedChapter);
      setChapter(updatedChapter);
    }

    if (isChapterMode && chapter?.isTemporary && chapterChanged) {
      const remaining = await getAllFromIndex("records", "chapterId", currentChapterId);
      if (remaining.length === 0) {
        await deleteItem("chapters", currentChapterId);
      }
    }

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
    setIsSheetOpen(true);
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

  const closeSheet = () => {
    setSheetDragY(0);
    sheetDragStart.current = null;
    sheetDragOffset.current = 0;
    setIsSheetOpen(false);
    cancelEdit();
  };

  // 시트가 열려 있는 동안 하드웨어 뒤로가기가 페이지 대신 시트를 닫도록 등록
  closeSheetRef.current = closeSheet;
  useEffect(() => {
    if (!isSheetOpen) return;
    const unregister = pushBackHandler(() => closeSheetRef.current());
    return unregister;
  }, [isSheetOpen]);

  // 아래로 스와이프하여 닫기 (내부 스크롤이 최상단일 때만 드래그 시작)
  const onSheetTouchStart = (e) => {
    if (sheetRef.current && sheetRef.current.scrollTop > 0) return;
    sheetDragStart.current = e.touches[0].clientY;
  };
  const onSheetTouchMove = (e) => {
    if (sheetDragStart.current == null) return;
    const dy = e.touches[0].clientY - sheetDragStart.current;
    sheetDragOffset.current = dy > 0 ? dy : 0;
    setSheetDragY(sheetDragOffset.current);
  };
  const onSheetTouchEnd = () => {
    if (sheetDragStart.current == null) return;
    const shouldClose = sheetDragOffset.current > 110;
    sheetDragStart.current = null;
    sheetDragOffset.current = 0;
    if (shouldClose) {
      closeSheet();
    } else {
      setSheetDragY(0);
    }
  };

  const openNewSheet = () => {
    cancelEdit();
    setIsSheetOpen(true);
  };

  const togglePaymentStatus = async () => {
    if (!isEditing || !editId || !editRecord) return;
    const updatedRecord = { ...editRecord, isPaid: !editRecord.isPaid, updatedAt: Date.now() };
    await put("records", updatedRecord);
    closeSheet();
    loadData();
    window.dispatchEvent(new CustomEvent("budget-db-updated"));
  };

  // 이 항목을 총액 계산에서 제외/포함 토글. 시트는 닫지 않고 즉시 반영해 변화를 바로 보여준다.
  const toggleExcludeFromCalc = async () => {
    if (!isEditing || !editId || !editRecord) return;
    const updatedRecord = { ...editRecord, excludedFromCalc: !editRecord.excludedFromCalc, updatedAt: Date.now() };
    await put("records", updatedRecord);
    setEditRecord(updatedRecord);
    loadData();
    window.dispatchEvent(new CustomEvent("budget-db-updated"));
  };

  // 이 항목을 복제해 같은 수입/지출 영역에 새 항목으로 추가
  const copyRecord = async () => {
    if (!editRecord) return;
    const nextOrder = records.filter((r) => r.type === editRecord.type).length;
    await add("records", {
      chapterId: isChapterMode ? chapterId : undefined,
      title: editRecord.title,
      amount: editRecord.amount,
      type: editRecord.type,
      category: editRecord.category,
      date: editRecord.date,
      source: editRecord.title,
      isPaid: false,
      excludedFromCalc: false,
      createdAt: new Date(),
      updatedAt: Date.now(),
      inputMode: editRecord.inputMode || "manual",
      id: `rec_${Date.now()}`,
      order: nextOrder,
    });
    closeSheet();
    loadData();
    window.dispatchEvent(new CustomEvent("budget-db-updated"));
  };

  const deleteRecord = async () => {
    if (!editId) return;
    const target = records.find((r) => r.id === editId);
    if (target) {
      await put("records", { ...target, isDeleted: true, updatedAt: Date.now() });
    } else {
      await deleteItem("records", editId);
    }
    closeSheet();
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
          rightButton={
            <S.ExcludePaidToggleBtn
              type="button"
              $on={excludePaidFromCalc}
              aria-pressed={excludePaidFromCalc}
              onClick={() => setExcludePaidFromCalc((v) => !v)}
            >
              납부완료 제외
            </S.ExcludePaidToggleBtn>
          }
        />
      </S.HeaderFix>

      <S.Content ref={contentRef}>
        <S.SummaryCard>
          <S.BalanceLabel>잔액</S.BalanceLabel>
          <S.BalanceAmount $negative={balance < 0}>
            {formatNumber(balance)} {unit}
          </S.BalanceAmount>
          {excludedCount > 0 && (
            <S.ExcludedNote>계산 제외 {excludedCount}건 반영</S.ExcludedNote>
          )}
          <S.StatGrid>
            <S.StatChip>
              <span>수입</span>
              <strong>{formatNumber(incomeSum)} {unit}</strong>
            </S.StatChip>
            <S.StatChip>
              <span>예산</span>
              <strong>{formatNumber(budgetSum)} {unit}</strong>
            </S.StatChip>
            <S.StatChip>
              <span>지출</span>
              <strong>{formatNumber(autoExpenseSum)} {unit}</strong>
            </S.StatChip>
          </S.StatGrid>
        </S.SummaryCard>

        {isEditing && editRecord && (
          <S.EditBanner>
            <span>✏️ "{editRecord.title}" 수정 중</span>
            <S.EditBannerCancel onClick={closeSheet}>취소</S.EditBannerCancel>
          </S.EditBanner>
        )}

        <DataList
          incomeList={incomeList}
          budgetList={budgetList}
          expenseList={autoExpenseList}
          settings={settings}
          editId={editId}
          unit={unit}
          collapsedState={collapsedState}
          onToggleSection={toggleSection}
          onToggleIncomeGroup={() => updateSetting("isIncomeGrouped", !settings.isIncomeGrouped)}
          onToggleExpenseGroup={() => updateSetting("isExpenseGrouped", !settings.isExpenseGrouped)}
          onDragEnd={onDragEnd}
          onEdit={startEdit}
          enablePullToRefresh={false}
        />
      </S.Content>

      {/* FAB */}
      <S.FAB onClick={openNewSheet}>+</S.FAB>

      {/* Bottom sheet */}
      {isSheetOpen &&
        ReactDOM.createPortal(
          <>
            <S.SheetBackdrop onClick={closeSheet} />
            <S.Sheet
              ref={sheetRef}
              onTouchStart={onSheetTouchStart}
              onTouchMove={onSheetTouchMove}
              onTouchEnd={onSheetTouchEnd}
              style={{
                transform: sheetDragY ? `translateX(-50%) translateY(${sheetDragY}px)` : undefined,
                transition: sheetDragStart.current != null ? "none" : "transform 0.25s cubic-bezier(0.2, 0, 0, 1)",
              }}
            >
              <S.SheetHandle />
              <DataForm
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
                onCancel={closeSheet}
                onTogglePaid={togglePaymentStatus}
                onToggleExclude={toggleExcludeFromCalc}
                onCopy={isEditing ? copyRecord : undefined}
                onDelete={isEditing ? deleteRecord : undefined}
              />
            </S.Sheet>
          </>,
          document.body,
        )}
    </S.PageWrap>
  );
}
