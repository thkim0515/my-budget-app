import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef, useMemo } from "react";

import Header from "../../components/UI/Header";
import { formatNumber, unformatNumber } from "../../utils/numberFormat";
import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { useSettings } from "../../context/SettingsContext";

import RecordForm from "../../components/RecordForm";
import RecordList from "../../components/RecordList";

import * as S from "./DetailPage.styles";

/* 날짜를 기반으로 챕터 제목을 자동 생성하는 함수 */
const formatChapterTitle = (dateString) => {
  const d = new Date(dateString);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
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
  // ★ subscribe 추가 (수동 loadRecords 제거를 위해)
  const { db, get, add, put, deleteItem, subscribe } = useBudgetDB();
  const { settings, updateSetting } = useSettings();

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

  // ★ [핵심 수정 1] ID 타입 안전하게 변환 (Number 강제 변환 제거)
  const safeChapterId = useMemo(() => {
    if (!chapterId) return null;
    // 숫자로 변환해보고, NaN이면(문자열 ID면) 그대로 씀
    const num = Number(chapterId);
    return isNaN(num) ? chapterId : num;
  }, [chapterId]);

  // ★ [핵심 수정 2] 실시간 데이터 구독 (subscribe 사용)
  useEffect(() => {
    // 1. 카테고리 구독
    const unsubCategories = subscribe("categories", (list) => {
      const names = list.map((c) => c.name);
      setCategories(names);
      if (!category && names.length > 0) setCategory(names[0]);
    });

    // 2. 레코드 구독
    const unsubRecords = subscribe("records", (allRecords) => {
      let list = [];
      if (isChapterMode) {
        // chapterId가 일치하는 것만 필터링 (타입 주의: == 비교로 처리하거나 String 변환 후 비교)
        list = allRecords.filter((r) => String(r.chapterId) === String(safeChapterId));
      } else if (isDateMode) {
        list = allRecords.filter((r) => String(r.date || r.createdAt).split("T")[0] === date);
      }

      // 정렬 로직
      list.sort((a, b) => {
        const da = new Date(a.date || a.createdAt);
        const dbDate = new Date(b.date || b.createdAt);
        if (da.getTime() !== dbDate.getTime()) return da - dbDate;
        return (a.order ?? 0) - (b.order ?? 0);
      });
      setRecords(list);
    });

    return () => {
      unsubCategories && unsubCategories();
      unsubRecords && unsubRecords();
    };
  }, [subscribe, isChapterMode, isDateMode, safeChapterId, date]); // category 의존성 제거

  // ★ [핵심 수정 3] 챕터 정보 가져오기 (safeChapterId 사용)
  useEffect(() => {
    if (isChapterMode && safeChapterId && db) {
      get("chapters", safeChapterId).then((data) => {
        setChapter(data);
        if (data && !isDateMode && !isEditing) {
          const chapterDate = new Date(data.createdAt);
          const today = new Date();
          if (chapterDate.getFullYear() === today.getFullYear() && chapterDate.getMonth() === today.getMonth()) {
            setRecordDate(today.toISOString().split("T")[0]);
          } else {
            const yyyy = chapterDate.getFullYear();
            const mm = String(chapterDate.getMonth() + 1).padStart(2, "0");
            setRecordDate(`${yyyy}-${mm}-01`);
          }
        }
      });
    }
  }, [db, isChapterMode, safeChapterId, date]); // isEditing 제거

  // 특정 항목으로 스크롤
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
    // ★ [수정] safeChapterId 사용
    const currentChapterId = isChapterMode ? safeChapterId : null;
    let targetChapterId = currentChapterId;
    let chapterChanged = false;

    // 챕터 이름 자동 관리 로직
    if (isChapterMode && chapter) {
      if (newChapterTitle !== chapter.title) {
        // subscribe로 받아온 상태 대신 직접 조회할 수도 있지만, 여기서는 편의상 get/add 사용
        // 주의: 챕터 목록 전체를 가져오는 API가 useBudgetDB에 없으므로 (필요시 추가),
        // 여기서는 간단히 새 챕터를 무조건 생성하거나 기존 로직 유지.
        // *참고: 원본 로직 유지하되 add가 리턴하는 ID 사용

        // (간소화를 위해 기존 로직과 동일하게 처리하되 ID 타입만 주의)
        // 만약 여기서 전체 챕터를 뒤져야 한다면 subscribe된 chapters state가 필요할 수 있음.
        // 일단은 '새로 생성' 로직으로 진행
        const result = await add("chapters", {
          title: newChapterTitle,
          createdAt: new Date(recordDate),
          order: 999, // 임시 순서
          isTemporary: false,
        });
        targetChapterId = result.id; // add는 id가 포함된 객체 리턴
        chapterChanged = true;
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
      // await loadRecords(); <--- 제거 (subscribe가 자동 갱신)
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
    // await loadRecords(); <--- 제거

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
    // loadRecords(); <--- 제거
  };

  const deleteRecord = async (rid, isAggregated) => {
    if (isAggregated) {
      alert("모아보기 상태에서는 삭제할 수 없습니다.");
      return;
    }
    if (!window.confirm("정말 삭제하시겠습니까?")) return;
    await deleteItem("records", rid);
    // loadRecords(); <--- 제거
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
    // loadRecords(); <--- 제거
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
