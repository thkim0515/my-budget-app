import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useMemo } from "react";

import Header from "../../components/UI/Header";
import { formatNumber, unformatNumber } from "../../utils/numberFormat";
import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { useSettings } from "../../context/SettingsContext";
import { DEFAULT_CATEGORIES } from "../../constants/categories"; // [수정1] 기본 카테고리 임포트

import RecordForm from "../../components/RecordForm";
import RecordList from "../../components/RecordList";

import * as S from "./DetailPage.styles";

/* 한국 시간(KST) 기준 오늘 날짜 문자열(YYYY-MM-DD) 반환 헬퍼 */
const getTodayKST = () => {
  return new Date().toLocaleDateString("en-CA", {
    timeZone: "Asia/Seoul",
  });
};

/* 날짜를 기반으로 챕터 제목을 자동 생성하는 함수 */
const formatChapterTitle = (dateString) => {
  if (!dateString) return "";
  const [y, m] = dateString.split("-");
  return `${y}년 ${parseInt(m, 10)}월`;
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

  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [chapter, setChapter] = useState(null);

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");

  // 초기 날짜 설정 로직 (KST 적용)
  const [recordDate, setRecordDate] = useState(() => {
    if (isDateMode) return date;
    return getTodayKST();
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editType, setEditType] = useState(null);
  const [editRecord, setEditRecord] = useState(null);

  const loadRecords = async () => {
    if (!db) return;
    let list = [];
    if (isChapterMode) {
      list = await getAllFromIndex("records", "chapterId", Number(chapterId));
    } else if (isDateMode) {
      const all = await getAll("records");
      list = all.filter((r) => String(r.date || r.createdAt).split("T")[0] === date);
    }
    list.sort((a, b) => {
      const da = new Date(a.date || a.createdAt);
      const dbDate = new Date(b.date || b.createdAt);
      if (da.getTime() !== dbDate.getTime()) return da - dbDate;
      return (a.order ?? 0) - (b.order ?? 0);
    });
    setRecords(list);
  };

  // [수정2] 카테고리 로드 함수 보완 (DB 비었을 시 기본값 사용)
  const loadCategories = async () => {
    if (!db) return;

    // 1. DB에서 불러오기
    const rows = await getAll("categories");
    let list = rows.map((c) => c.name);

    // 2. DB가 비어있다면 기본 카테고리 사용
    if (list.length === 0) {
      list = [...DEFAULT_CATEGORIES];
    }

    setCategories(list);

    // 3. 현재 선택된 카테고리가 없다면 첫 번째 항목 선택
    if (!category && list.length > 0) {
      setCategory(list[0]);
    }
  };

  useEffect(() => {
    if (!db) return;
    loadRecords();
    loadCategories();

    if (isChapterMode) {
      db.get("chapters", Number(chapterId)).then((data) => {
        setChapter(data);
        if (data && !isDateMode && !isEditing) {
          const chapterDate = new Date(data.createdAt);

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
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, chapterId, date]);

  // 특정 항목으로 스크롤 (DateMode 진입 시)
  useEffect(() => {
    if (!isDateMode || records.length === 0) return;
    const target = document.getElementById(`record-${paramId}`);
    if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [records, isDateMode, paramId]);

  const incomeSum = records.filter((r) => r.type === "income").reduce((a, b) => a + b.amount, 0);
  const expenseSum = records.filter((r) => r.type === "expense").reduce((a, b) => a + b.amount, 0);

  const displayedIncomeList = useMemo(() => {
    const list = records.filter((r) => r.type === "income");
    return settings.isIncomeGrouped ? groupRecordsByTitle(list) : list;
  }, [records, settings.isIncomeGrouped]);

  const displayedExpenseList = useMemo(() => {
    const list = records.filter((r) => r.type === "expense");
    return settings.isExpenseGrouped ? groupRecordsByTitle(list) : list;
  }, [records, settings.isExpenseGrouped]);

  const saveRecord = async (type) => {
    if (!title || !amount) return;

    const recordAmount = unformatNumber(amount);
    const newChapterTitle = formatChapterTitle(recordDate);
    const currentChapterId = isChapterMode ? Number(chapterId) : null;
    let targetChapterId = currentChapterId;
    let chapterChanged = false;

    // 챕터 이름 자동 관리 로직
    if (isChapterMode && chapter) {
      if (newChapterTitle !== chapter.title) {
        const allChapters = await getAll("chapters");
        const existingChapter = allChapters.find((c) => c.title === newChapterTitle);
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

    if (isEditing && editId) {
      const updated = {
        ...recordDataBase,
        id: editId,
        order: !chapterChanged && editRecord?.type === type ? editRecord.order ?? 0 : records.filter((r) => r.type === type).length,
      };
      await put("records", updated);
      cancelEdit();
      await loadRecords();
      return;
    }

    const nextOrder = records.filter((r) => r.type === type).length;
    await add("records", { ...recordDataBase, order: nextOrder });

    // 임시 챕터를 정식 챕터로 전환
    if (isChapterMode && chapter?.isTemporary && targetChapterId === currentChapterId) {
      const updatedChapter = { ...chapter, title: newChapterTitle, isTemporary: false };
      await put("chapters", updatedChapter);
      setChapter(updatedChapter);
    }

    setTitle("");
    setAmount("");
    await loadRecords();

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
    setRecordDate(String(record.date || record.createdAt).split("T")[0]);
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
    const updatedRecord = { ...editRecord, isPaid: !editRecord.isPaid };
    await put("records", updatedRecord);
    cancelEdit();
    loadRecords();
  };

  const deleteRecord = async (rid, isAggregated) => {
    if (isAggregated) {
      alert("모아보기 상태에서는 삭제할 수 없습니다.");
      return;
    }
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    await deleteItem("records", rid);
    loadRecords();
  };

  const onDragEnd = async (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const isIncomeSource = source.droppableId === "incomeList";
    if (isIncomeSource && settings.isIncomeGrouped) return;
    if (!isIncomeSource && settings.isExpenseGrouped) return;

    const sourceList = records.filter((r) => r.type === (isIncomeSource ? "income" : "expense"));
    const destList = records.filter((r) => r.type === (destination.droppableId === "incomeList" ? "income" : "expense"));
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

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header title={isChapterMode ? (chapter?.isTemporary ? "내역 입력" : chapter?.title) : `${date} 상세 내역`} />
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

        <RecordList
          incomeList={displayedIncomeList}
          expenseList={displayedExpenseList}
          settings={settings}
          editId={editId}
          unit={unit}
          onToggleIncomeGroup={() => updateSetting("isIncomeGrouped", !settings.isIncomeGrouped)}
          onToggleExpenseGroup={() => updateSetting("isExpenseGrouped", !settings.isExpenseGrouped)}
          onDragEnd={onDragEnd}
          onEdit={startEdit}
          onDelete={deleteRecord}
        />
      </S.Content>
    </S.PageWrap>
  );
}
