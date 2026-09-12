/* src/pages/Main/MainPage.jsx */
import { useEffect, useState, useCallback, useMemo } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import { useTheme } from "styled-components";
import Header from "../../components/UI/Header";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import { useSettings } from "../../context/SettingsContext";
import { formatNumber, unformatNumber } from "../../utils/numberFormat";
import { computeCardUsage, getLimitColor, getCurrentYm } from "../../utils/cardLimit";
import { FiEdit3, FiCopy, FiCheckCircle, FiTrash2, FiArrowUp, FiArrowDown } from "react-icons/fi";
import * as S from "./MainPage.styles";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

const buildYearOptions = (centerYear, minYear = 1970, maxYear = 2999) => {
  const safeCenter = Number.isInteger(centerYear) ? centerYear : new Date().getFullYear();
  const start = Math.max(minYear, safeCenter - 10);
  const end = Math.min(maxYear, safeCenter + 10);
  return Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
};

const toDateSafe = (value) => {
  if (!value) return new Date();
  if (value.toDate) return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const monthName = (month) => String(month).padStart(2, "0");

const getChapterYear = (chapter) => toDateSafe(chapter?.createdAt || new Date()).getFullYear();

const replaceMonthWithClamp = (sourceDate, targetYear, targetMonth) => {
  const date = toDateSafe(sourceDate);
  const safeDay = Math.min(date.getDate(), new Date(targetYear, targetMonth, 0).getDate());
  return `${targetYear}-${monthName(targetMonth)}-${String(safeDay).padStart(2, "0")}`;
};

const makeChapterTitle = (year, month) => `${year}년 ${month}월`;

const isIncomeOrBudgetRecord = (record) => {
  if (record.type === "income") return true;
  if (record.type === "expense" && record.inputMode === "manual") return true;
  return false;
};

const MODAL_OVERLAY = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 250,
};
const MODAL_ROW = { display: "flex", gap: 10, marginTop: 16 };
const MODAL_BTN = (bg) => ({
  flex: 1, border: "none", color: "#fff", padding: "10px 12px",
  borderRadius: 8, cursor: "pointer", background: bg, fontSize: 15, fontWeight: 600,
});

const SORT_OPTIONS = [
  { key: "order", label: "기본순" },
  { key: "newest", label: "최신순" },
  { key: "oldest", label: "오래된순" },
];

export default function MainPage() {
  const theme = useTheme();
  const { unit } = useCurrencyUnit();
  const { settings, updateSetting } = useSettings();
  const [chapters, setChapters] = useState([]);
  const [balanceByChapter, setBalanceByChapter] = useState({});
  const [cardUsedRaw, setCardUsedRaw] = useState(0);
  const [cardLimitModalOpen, setCardLimitModalOpen] = useState(false);
  const [cardLimitManualInput, setCardLimitManualInput] = useState("");
  const [sortKey, setSortKey] = useState("newest");
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(
    () => localStorage.getItem("mainpage_hide_completed") === "true"
  );

  useEffect(() => {
    localStorage.setItem("mainpage_hide_completed", String(hideCompleted));
  }, [hideCompleted]);

  const [copyTargetChapter, setCopyTargetChapter] = useState(null);
  const [copyTargetMonth, setCopyTargetMonth] = useState(String(new Date().getMonth() + 1));
  const [copyTargetYear, setCopyTargetYear] = useState(String(new Date().getFullYear()));

  const [editingChapter, setEditingChapter] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");

  const navigate = useNavigate();
  const { db, getAll, getAllFromIndex, add, addMany, put, deleteItem } = useBudgetDB();

  const loadChapters = useCallback(async () => {
    if (!db) return;
    const list = await getAll("chapters");
    setChapters(list);

    // 챕터별 수입 / 예산(직접 입력 지출) / 잔액 계산. 계산 제외 항목은 제외.
    const records = await getAll("records");
    const map = {};
    records.forEach((r) => {
      if (r.excludedFromCalc || !r.chapterId) return;
      if (!map[r.chapterId]) map[r.chapterId] = { income: 0, budget: 0, balance: 0 };
      const m = map[r.chapterId];
      if (r.type === "income") {
        m.income += r.amount;
        m.balance += r.amount;
      } else {
        if (r.inputMode === "manual") m.budget += r.amount;
        m.balance -= r.amount;
      }
    });
    setBalanceByChapter(map);
    setCardUsedRaw(computeCardUsage(records, settings.cardLimitProvider));
  }, [db, getAll, settings.cardLimitProvider]);

  useEffect(() => {
    loadChapters();
    const handle = () => loadChapters();
    window.addEventListener("budget-db-updated", handle);
    return () => window.removeEventListener("budget-db-updated", handle);
  }, [db, loadChapters]);

  const displayedChapters = useMemo(() => {
    const visible = chapters.filter((c) => !c.isTemporary && !(hideCompleted && c.isCompleted));
    const sorted = [...visible];
    if (sortKey === "newest") {
      sorted.sort((a, b) => toDateSafe(b.createdAt) - toDateSafe(a.createdAt));
    } else if (sortKey === "oldest") {
      sorted.sort((a, b) => toDateSafe(a.createdAt) - toDateSafe(b.createdAt));
    } else {
      sorted.sort((a, b) => {
        if (a.order !== b.order) return (a.order ?? 999) - (b.order ?? 999);
        return toDateSafe(b.createdAt) - toDateSafe(a.createdAt);
      });
    }
    return sorted;
  }, [chapters, sortKey, hideCompleted]);

  const copyYearOptions = useMemo(() => {
    if (!copyTargetChapter) return [];
    return buildYearOptions(getChapterYear(copyTargetChapter));
  }, [copyTargetChapter]);

  const createTemporaryChapter = async () => {
    const now = new Date();
    const id = await add("chapters", {
      title: `_TEMP_${now.getTime()}`,
      createdAt: now,
      order: 999,
      isTemporary: true,
      isCompleted: false,
    });
    await loadChapters();
    navigate(`/detail/chapter/${id}`);
  };

  const deleteChapter = async (chapterId) => {
    if (!window.confirm("해당 기록을 삭제하시겠습니까?")) return;
    await deleteItem("chapters", chapterId);
    const records = await getAllFromIndex("records", "chapterId", chapterId);
    for (const r of records) await deleteItem("records", r.id);
    loadChapters();
  };

  const toggleComplete = async (chapter) => {
    await put("chapters", { ...chapter, isCompleted: !chapter.isCompleted });
    loadChapters();
  };

  const openCopyModal = (chapter) => {
    const baseYear = getChapterYear(chapter);
    setCopyTargetMonth(String(new Date().getMonth() + 1));
    setCopyTargetYear(String(baseYear));
    setCopyTargetChapter({ ...chapter });
  };

  const closeCopyModal = () => {
    setCopyTargetChapter(null);
    setCopyTargetMonth(String(new Date().getMonth() + 1));
    setCopyTargetYear(String(new Date().getFullYear()));
  };

  const executeCopy = async () => {
    if (!copyTargetChapter) return;

    const targetMonth = Number(copyTargetMonth);
    if (!Number.isInteger(targetMonth) || targetMonth < 1 || targetMonth > 12) {
      alert("1~12 사이의 월만 입력할 수 있습니다.");
      return;
    }
    const targetYear = Number(copyTargetYear);
    if (!Number.isInteger(targetYear) || targetYear < 1970 || targetYear > 2999) {
      alert("유효한 연도를 입력해 주세요.");
      return;
    }

    const targetTitle = makeChapterTitle(targetYear, targetMonth);
    const allChapters = await getAll("chapters");
    if (allChapters.some((c) => c.title === targetTitle)) {
      alert("이미 존재하는 챕터입니다.");
      return;
    }

    const recordsInSource = await getAllFromIndex("records", "chapterId", copyTargetChapter.chapterId);
    const targetRecords = recordsInSource
      .filter(isIncomeOrBudgetRecord)
      .sort((a, b) => {
        if (a.order !== b.order) return (a.order ?? 999) - (b.order ?? 999);
        return toDateSafe(a.date || a.createdAt) - toDateSafe(b.date || b.createdAt);
      })
      .map((r, index) => {
        const newDate = replaceMonthWithClamp(r.date || r.createdAt, targetYear, targetMonth);
        const { id, ...sourceRecord } = r;
        return {
          ...sourceRecord,
          id: `${id}_copy_${targetYear}_${targetMonth}_${index}`,
          chapterId: null,
          date: newDate,
          createdAt: newDate,
          order: index,
          updatedAt: Date.now(),
        };
      });

    const nextOrder = allChapters.filter((c) => !c.isTemporary).length;
    const newChapterId = await add("chapters", {
      title: targetTitle,
      createdAt: new Date(`${targetYear}-${monthName(targetMonth)}-01`),
      order: nextOrder,
      isTemporary: false,
      isCompleted: false,
    });

    if (newChapterId && targetRecords.length > 0) {
      await addMany("records", targetRecords.map((r) => ({ ...r, chapterId: newChapterId })), true);
    }

    window.dispatchEvent(new CustomEvent("budget-db-updated"));
    await loadChapters();
    closeCopyModal();
    navigate(`/detail/chapter/${newChapterId}`);
  };

  const openRenameChapter = (chapter) => {
    setEditingChapter(chapter);
    setEditingTitle(chapter.title || "");
  };

  const cancelRename = () => {
    setEditingChapter(null);
    setEditingTitle("");
  };

  const executeRename = async () => {
    if (!editingChapter) return;
    const nextTitle = editingTitle.trim();
    if (!nextTitle) { alert("제목을 입력해 주세요."); return; }
    if (chapters.some((c) => c.chapterId !== editingChapter.chapterId && c.title === nextTitle)) {
      alert("이미 존재하는 챕터입니다."); return;
    }
    await put("chapters", { ...editingChapter, title: nextTitle });
    cancelRename();
    window.dispatchEvent(new CustomEvent("budget-db-updated"));
    loadChapters();
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? "정렬";

  const showCardLimit = settings.cardLimitEnabled && settings.cardLimitProvider && settings.cardLimitAmount > 0;
  // 이번 달이 아니면(달이 바뀌었으면) 지난 보정값은 자동으로 무시한다.
  const cardAdjustment = settings.cardLimitAdjustmentMonth === getCurrentYm() ? settings.cardLimitAdjustment : 0;
  // 카드 승인 문자의 "누적OOO원"을 이번 달 선택된 카드사 기준으로 받아둔 게 있으면
  // (지출 자동저장이 꺼져 있어도 항상 갱신됨) 그 값을 그대로 사용액으로 쓴다.
  // 아직 문자를 못 받았다면 기존 방식(로컬에 저장된 지출 내역 합계 + 수동 보정값)으로 대체한다.
  const hasAccumulated =
    !!settings.cardLimitProvider &&
    settings.cardLimitAccumulatedProvider === settings.cardLimitProvider &&
    settings.cardLimitAccumulatedYm === getCurrentYm();
  const cardUsed = hasAccumulated
    ? Math.max(0, settings.cardLimitAccumulated)
    : Math.max(0, cardUsedRaw + cardAdjustment);
  const cardRemaining = settings.cardLimitAmount - cardUsed;
  const cardRatio = showCardLimit ? Math.min(1, Math.max(0, cardUsed / settings.cardLimitAmount)) : 0;
  const cardColor = getLimitColor(cardRatio);

  const openCardLimitModal = () => {
    setCardLimitManualInput(cardRemaining > 0 ? String(Math.round(cardRemaining)) : "0");
    setCardLimitModalOpen(true);
  };
  const closeCardLimitModal = () => setCardLimitModalOpen(false);

  // 한도 리셋: 이번 달 사용액을 0으로 되돌린다.
  // - 문자 기반 누적값을 쓰는 중이면 누적값 자체를 0으로.
  // - 아니면 기존 방식대로 보정값으로 상쇄(실제 자동 계산치는 그대로 둠).
  const resetCardLimit = () => {
    if (hasAccumulated) {
      updateSetting("cardLimitAccumulated", 0);
    } else {
      updateSetting("cardLimitAdjustment", -cardUsedRaw);
      updateSetting("cardLimitAdjustmentMonth", getCurrentYm());
    }
    closeCardLimitModal();
  };

  // 남은 한도를 사용자가 직접 입력한 값으로 맞춘다.
  const applyManualCardLimit = () => {
    const desiredRemaining = unformatNumber(cardLimitManualInput);
    const desiredUsed = settings.cardLimitAmount - desiredRemaining;
    if (hasAccumulated) {
      updateSetting("cardLimitAccumulated", Math.max(0, desiredUsed));
    } else {
      updateSetting("cardLimitAdjustment", desiredUsed - cardUsedRaw);
      updateSetting("cardLimitAdjustmentMonth", getCurrentYm());
    }
    closeCardLimitModal();
  };

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header
          title="가계부"
          rightButton={
            <S.HeaderButtons>
              <S.HideCompletedBtn
                type="button"
                $on={hideCompleted}
                aria-pressed={hideCompleted}
                onClick={() => setHideCompleted((v) => !v)}
              >
                완료 항목 숨기기
              </S.HideCompletedBtn>
              <div style={{ position: "relative" }}>
                <S.SortBtn onClick={() => setSortMenuOpen((v) => !v)}>
                  {sortKey === "newest" ? <FiArrowDown size={13} /> : sortKey === "oldest" ? <FiArrowUp size={13} /> : null}
                  {currentSortLabel}
                </S.SortBtn>
                {sortMenuOpen && (
                  <div
                    style={{
                      position: "absolute", top: "100%", right: 0, marginTop: 4,
                      background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 8,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.2)", zIndex: 100, minWidth: 110,
                    }}
                  >
                    {SORT_OPTIONS.map((o) => (
                      <button
                        key={o.key}
                        onClick={() => { setSortKey(o.key); setSortMenuOpen(false); }}
                        style={{
                          display: "block", width: "100%", padding: "10px 14px",
                          background: sortKey === o.key ? theme.activeBg : "transparent",
                          border: "none", textAlign: "left", fontSize: 14,
                          fontWeight: sortKey === o.key ? 700 : 400,
                          cursor: "pointer", color: theme.text,
                        }}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <S.CreateBtn onClick={createTemporaryChapter}>새 내역 추가</S.CreateBtn>
            </S.HeaderButtons>
          }
        />
      </S.HeaderFix>

      <S.ListWrap $withCardLimit={showCardLimit} onClick={() => setSortMenuOpen(false)}>
        {displayedChapters.length === 0 && (
          <S.EmptyState>
            <p>아직 내역이 없습니다.</p>
            <p>우측 상단 "새 내역 추가"를 눌러 시작하세요.</p>
          </S.EmptyState>
        )}
        {displayedChapters.map((c) => (
          <S.ChapterRow key={c.chapterId} $completed={c.isCompleted}>
            <S.ChapterMain onClick={() => navigate(`/detail/chapter/${c.chapterId}`)}>
              <S.ChapterTitle>{c.title}</S.ChapterTitle>
              {(() => {
                const m = balanceByChapter[c.chapterId] || { income: 0, budget: 0, balance: 0 };
                return (
                  <S.StatRow>
                    <S.StatItem $tone="income">
                      <small>수입</small>
                      <strong>{m.income > 0 ? "+" : ""}{formatNumber(m.income)} {unit}</strong>
                    </S.StatItem>
                    <S.StatItem $tone="expense">
                      <small>예산</small>
                      <strong>{m.budget > 0 ? "-" : ""}{formatNumber(m.budget)} {unit}</strong>
                    </S.StatItem>
                    <S.StatItem $tone={m.balance < 0 ? "expense" : "income"}>
                      <small>잔액</small>
                      <strong>{m.balance > 0 ? "+" : ""}{formatNumber(m.balance)} {unit}</strong>
                    </S.StatItem>
                  </S.StatRow>
                );
              })()}
            </S.ChapterMain>

            <S.ActionGroup>
              <S.ActionBtn
                $bg={c.isCompleted ? "#9098A8" : "#12B76A"}
                title={c.isCompleted ? "완료 취소" : "완료 처리"}
                onClick={(e) => { e.stopPropagation(); toggleComplete(c); }}
              >
                <FiCheckCircle size={11} />
                {c.isCompleted ? "해제" : "완료"}
              </S.ActionBtn>

              <S.ActionBtn
                $bg="#6F5BFF"
                title="챕터 제목 수정"
                onClick={(e) => { e.stopPropagation(); openRenameChapter(c); }}
              >
                <FiEdit3 size={11} />
                편집
              </S.ActionBtn>

              <S.ActionBtn
                $bg="#4C6FFF"
                title="챕터 복사"
                onClick={(e) => { e.stopPropagation(); openCopyModal(c); }}
              >
                <FiCopy size={11} />
                복사
              </S.ActionBtn>

              <S.ActionBtn
                $bg="#F5455C"
                title="삭제"
                onClick={(e) => { e.stopPropagation(); deleteChapter(c.chapterId); }}
              >
                <FiTrash2 size={11} />
                삭제
              </S.ActionBtn>
            </S.ActionGroup>
          </S.ChapterRow>
        ))}
      </S.ListWrap>

      {showCardLimit && (
        <S.CardLimitBar onClick={openCardLimitModal}>
          <S.CardLimitTitle>현재 {settings.cardLimitProvider} 한도</S.CardLimitTitle>
          <S.CardLimitAmount $color={cardColor}>
            {formatNumber(cardRemaining)} {unit} 남음
          </S.CardLimitAmount>
          <S.CardLimitTrack>
            <S.CardLimitFill $ratio={cardRatio} $color={cardColor} />
          </S.CardLimitTrack>
        </S.CardLimitBar>
      )}

      {/* 복사 모달 */}
      {copyTargetChapter &&
        ReactDOM.createPortal(
          <div style={MODAL_OVERLAY} onClick={closeCopyModal}>
            <div
              style={{
                width: "100%", maxWidth: 360,
                background: theme.card, borderRadius: 12,
                border: `1px solid ${theme.border}`, padding: 20, color: theme.text,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: 0, marginBottom: 12, textAlign: "center", color: theme.text }}>챕터 복사</h3>
              <p style={{ margin: "0 0 12px", fontSize: 14, color: theme.text, opacity: 0.7 }}>{copyTargetChapter.title}</p>

              <label style={{ display: "block", marginBottom: 8, fontSize: 14, color: theme.text }}>복사할 월</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={copyTargetYear}
                  onChange={(e) => setCopyTargetYear(e.target.value)}
                  style={{ width: "38%", borderRadius: 6, border: `1px solid ${theme.border}`, padding: 10, fontSize: 14, boxSizing: "border-box", background: theme.card, color: theme.text }}
                >
                  {copyYearOptions.length > 0
                    ? copyYearOptions.map((y) => <option key={y} value={y}>{y}년</option>)
                    : <option value={copyTargetYear}>{copyTargetYear}년</option>}
                </select>
                <select
                  value={copyTargetMonth}
                  onChange={(e) => setCopyTargetMonth(e.target.value)}
                  style={{ width: "62%", padding: 10, borderRadius: 6, border: `1px solid ${theme.border}`, fontSize: 14, boxSizing: "border-box", background: theme.card, color: theme.text }}
                >
                  {MONTH_OPTIONS.map((m) => <option key={m} value={m}>{m}월</option>)}
                </select>
              </div>

              <div style={MODAL_ROW}>
                <button style={MODAL_BTN("#4C6FFF")} onClick={executeCopy}>복사하기</button>
                <button style={MODAL_BTN("#6c757d")} onClick={closeCopyModal}>취소</button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* 이름 변경 모달 */}
      {editingChapter &&
        ReactDOM.createPortal(
          <div style={MODAL_OVERLAY} onClick={cancelRename}>
            <div
              style={{
                width: "100%", maxWidth: 360,
                background: theme.card, borderRadius: 12,
                border: `1px solid ${theme.border}`, padding: 20, color: theme.text,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: 0, marginBottom: 12, textAlign: "center", color: theme.text }}>챕터 제목 수정</h3>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: theme.text, opacity: 0.7 }}>{editingChapter.title} →</p>
              <input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && executeRename()}
                style={{ width: "100%", border: `1px solid ${theme.border}`, borderRadius: 6, padding: 10, marginBottom: 12, boxSizing: "border-box", background: theme.card, color: theme.text, fontSize: 15 }}
                placeholder="새 제목 입력"
                autoFocus
              />
              <div style={MODAL_ROW}>
                <button style={MODAL_BTN("#4C6FFF")} onClick={executeRename}>저장</button>
                <button style={MODAL_BTN("#6c757d")} onClick={cancelRename}>취소</button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* 카드 한도 리셋 / 직접 수정 모달 */}
      {cardLimitModalOpen &&
        ReactDOM.createPortal(
          <div style={MODAL_OVERLAY} onClick={closeCardLimitModal}>
            <div
              style={{
                width: "100%", maxWidth: 360,
                background: theme.card, borderRadius: 12,
                border: `1px solid ${theme.border}`, padding: 20, color: theme.text,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: 0, marginBottom: 4, textAlign: "center", color: theme.text }}>
                {settings.cardLimitProvider} 한도 관리
              </h3>
              <p style={{ margin: "0 0 16px", fontSize: 12, color: theme.subText, textAlign: "center" }}>
                현재 {formatNumber(cardRemaining)} {unit} 남음 (한도 {formatNumber(settings.cardLimitAmount)} {unit})
              </p>

              <button
                style={{ ...MODAL_BTN("#6F5BFF"), width: "100%", marginBottom: 16 }}
                onClick={resetCardLimit}
              >
                한도 리셋 (사용액 0으로)
              </button>

              <label style={{ display: "block", marginBottom: 8, fontSize: 13, color: theme.text }}>
                남은 한도 직접 입력 ({unit})
              </label>
              <input
                inputMode="numeric"
                value={cardLimitManualInput === "" ? "" : formatNumber(cardLimitManualInput)}
                onChange={(e) => setCardLimitManualInput(e.target.value.replace(/[^0-9]/g, ""))}
                style={{ width: "100%", border: `1px solid ${theme.border}`, borderRadius: 6, padding: 10, marginBottom: 12, boxSizing: "border-box", background: theme.card, color: theme.text, fontSize: 15 }}
                placeholder="예: 1900000"
              />

              <div style={MODAL_ROW}>
                <button style={MODAL_BTN("#4C6FFF")} onClick={applyManualCardLimit}>적용</button>
                <button style={MODAL_BTN("#6c757d")} onClick={closeCardLimitModal}>취소</button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </S.PageWrap>
  );
}
