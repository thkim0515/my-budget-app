import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useMemo, useCallback } from "react";

import Header from "../../components/UI/Header";
import { formatNumber, unformatNumber } from "../../utils/numberFormat";
import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { useSettings } from "../../context/SettingsContext";
import { useSync } from "../../hooks/useSync"; // [추가] 증분 동기화 훅
import { DEFAULT_CATEGORIES } from "../../constants/categories";

import RecordForm from "../../components/RecordForm";
import RecordList from "../../components/RecordList";

import { doc, deleteDoc } from "firebase/firestore";
import { db as firestoreDb, auth } from "../../db/firebase";

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
  if (dateValue.toDate) return dateValue.toDate(); // 파이어베이스 Timestamp 대응
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
  const { syncWithFirestore, isSyncing } = useSync(); // [추가] 동기화 기능

  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES); // 초기값은 기본 카테고리
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

  // [수동 새로고침 핸들러]
  const handleRefresh = async () => {
    if (auth.currentUser) {
      await syncWithFirestore(auth.currentUser.uid);
    } else {
      alert("로그인이 필요한 기능입니다.");
    }
  };

  // 챕터 진입 시 초기 날짜 설정
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
          const yyyy = cYear;
          const mm = String(cMonth).padStart(2, "0");
          setRecordDate(`${yyyy}-${mm}-01`);
        }
      }
    };
    initChapterDate();
  }, [db, isChapterMode, chapterId, isDateMode]);

  // [데이터 로드] 레코드 및 사용자 카테고리 통합 로드
  const loadData = useCallback(async () => {
    if (!db) return;

    // 1. 레코드 리스트 로드
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

    // 2. 챕터 정보 로드
    if (isChapterMode) {
      const data = await db.get("chapters", chapterId);
      setChapter(data);
    }

    // 3. [추가] 사용자 정의 카테고리 로드 및 통합
    const customCats = await getAll("categories");
    const activeCustomNames = customCats.filter((c) => !c.isDeleted).map((c) => c.name);

    // 기본 카테고리와 합치고 중복 제거
    const mergedCategories = [...new Set([...DEFAULT_CATEGORIES, ...activeCustomNames])];
    setCategories(mergedCategories);
  }, [db, chapterId, date, isChapterMode, isDateMode, getAll, getAllFromIndex]);

  useEffect(() => {
    loadData();
    const handleSyncUpdate = () => {
      loadData();
    };
    window.addEventListener("budget-db-updated", handleSyncUpdate);
    return () => window.removeEventListener("budget-db-updated", handleSyncUpdate);
  }, [loadData]);

  useEffect(() => {
    if (!isDateMode || records.length === 0) return;
    const target = document.getElementById(`record-${paramId}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [records, isDateMode, paramId]);

  const incomeSum = records.filter((r) => r.type === "income").reduce((a, b) => a + b.amount, 0);
  const expenseSum = records.filter((r) => r.type === "expense").reduce((a, b) => a + b.amount, 0);

  // [목록 3분할 필터링]
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

  // [저장 로직]
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
      updatedAt: Date.now(), // [중요] 증분 동기화용
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
    const yyyy = safeDate.getFullYear();
    const mm = String(safeDate.getMonth() + 1).padStart(2, "0");
    const dd = String(safeDate.getDate()).padStart(2, "0");
    setRecordDate(`${yyyy}-${mm}-${dd}`);

    setIsEditing(true);
    setTimeout(() => {
      contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }, 0);
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

    // Soft Delete (isDeleted 플래그 사용 시 put, 하드 삭제 시 deleteItem)
    // 증분 동기화를 위해서는 soft delete 후 updatedAt을 갱신하는 것이 가장 좋습니다.
    const target = records.find((r) => r.id === rid);
    if (target) {
      await put("records", { ...target, isDeleted: true, updatedAt: Date.now() });
    } else {
      await deleteItem("records", rid);
    }

    loadData();
    window.dispatchEvent(new CustomEvent("budget-db-updated"));
  };

  // [드래그 앤 드롭 로직]
  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (source.droppableId === "incomeList" && settings.isIncomeGrouped) return;
    if (source.droppableId === "expenseList" && settings.isExpenseGrouped) return;

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
      const newMode = destination.droppableId === "budgetList" ? "manual" : destination.droppableId === "expenseList" ? "auto" : removed.inputMode;

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

        <RecordForm
          isEditing={isEditing}
          editRecord={editRecord}
          editType={editType}
          title={title}
          amount={amount}
          category={category}
          categories={categories} // [업데이트됨] 사용자 추가 카테고리 포함
          recordDate={recordDate}
          setTitle={setTitle}
          setAmount={setAmount}
          setCategory={setCategory}
          setRecordDate={setRecordDate}
          onSave={saveRecord}
          onCancel={cancelEdit}
          onTogglePaid={togglePaymentStatus}
        />

        <RecordList
          incomeList={incomeList}
          budgetList={budgetList}
          expenseList={autoExpenseList}
          settings={settings}
          editId={editId}
          unit={unit}
          onToggleIncomeGroup={() => updateSetting("isIncomeGrouped", !settings.isIncomeGrouped)}
          onToggleExpenseGroup={() => updateSetting("isExpenseGrouped", !settings.isExpenseGrouped)}
          onDragEnd={onDragEnd}
          onEdit={startEdit}
          onDelete={deleteRecord}
          onRefresh={handleRefresh} // 당겨서 새로고침 연동용
        />
      </S.Content>
    </S.PageWrap>
  );
}
