/* src/pages/Main/MainPage.jsx */
import { useEffect, useState, useCallback, useMemo } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import Header from "../../components/UI/Header";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FiEdit3, FiCopy, FiCheckCircle, FiTrash2 } from "react-icons/fi";
import * as S from "./MainPage.styles";

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index + 1);

const SWIPE_ACTION_WIDTH = 228;
const SWIPE_TRIGGER_OFFSET = -56;
const SWIPE_ACTION_WIDTH_PX = `${SWIPE_ACTION_WIDTH}px`;
const SWIPE_DIRECTION_LOCK_THRESHOLD = 10;

const buildYearOptions = (centerYear, minYear = 1970, maxYear = 2999) => {
  const safeCenter = Number.isInteger(centerYear) ? centerYear : new Date().getFullYear();
  const startYear = Math.max(minYear, safeCenter - 10);
  const endYear = Math.min(maxYear, safeCenter + 10);

  return Array.from({ length: endYear - startYear + 1 }, (_, i) => String(startYear + i));
};

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

const toDateSafe = (value) => {
  if (!value) return new Date();
  if (value.toDate) return value.toDate();
  if (value instanceof Date) return value;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
};

const monthName = (month) => `${String(month).padStart(2, "0")}`;

const getChapterYear = (chapter) => {
  const sourceDate = toDateSafe(chapter?.createdAt || new Date());
  return sourceDate.getFullYear();
};

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

const MODAL_OVERLAY_STYLE = {
  position: "fixed",
  inset: 0,
  background: "rgba(0, 0, 0, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  zIndex: 250,
};

const MODAL_STYLE = {
  width: "100%",
  maxWidth: 360,
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #ddd",
  padding: 16,
  color: "#222",
};

const MODAL_ROW_STYLE = {
  display: "flex",
  gap: 10,
  marginTop: 16,
};

const MODAL_BUTTON = (bg) => ({
  flex: 1,
  border: "none",
  color: "#fff",
  padding: "10px 12px",
  borderRadius: 8,
  cursor: "pointer",
  background: bg,
});

const EDIT_BUTTON_STYLE = {
  background: "#6f42c1",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  padding: "6px 10px",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  cursor: "pointer",
  fontSize: 13,
};

const COPY_BUTTON_STYLE = {
  ...EDIT_BUTTON_STYLE,
  background: "#1976d2",
};

const COMPLETE_BUTTON_STYLE = {
  ...EDIT_BUTTON_STYLE,
  background: "#4caf50",
};

const DELETE_BUTTON_STYLE = {
  ...EDIT_BUTTON_STYLE,
  background: "#d9534f",
};

// 드래그 중인 요소를 Portal로 띄워주기 위한 헬퍼 컴포넌트
const DraggablePortal = ({ children, snapshot }) => {
  if (!snapshot.isDragging) return children;
  return ReactDOM.createPortal(children, document.body);
};

export default function MainPage() {
  const [chapters, setChapters] = useState([]);
  const [copyTargetChapter, setCopyTargetChapter] = useState(null);
  const [copyTargetMonth, setCopyTargetMonth] = useState(String(new Date().getMonth() + 1));
  const [copyTargetYear, setCopyTargetYear] = useState(String(new Date().getFullYear()));
  const [editingChapter, setEditingChapter] = useState(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [swipedChapterId, setSwipedChapterId] = useState(null);
  const [swipeState, setSwipeState] = useState({
    chapterId: null,
    startX: 0,
    startY: 0,
    startOffset: 0,
    offset: 0,
    isSwiping: false,
    isHorizontalSwipe: false,
  });

  const navigate = useNavigate();
  const { db, getAll, getAllFromIndex, add, addMany, put, deleteItem } = useBudgetDB();

  const loadChapters = useCallback(async () => {
    if (!db) return;
    const list = await getAll("chapters");
    list.sort((a, b) => {
      if (a.order !== b.order) return (a.order ?? 999) - (b.order ?? 999);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    setChapters(list);
  }, [db, getAll]);

  useEffect(() => {
    loadChapters();
    const handleSyncUpdate = () => loadChapters();
    window.addEventListener("budget-db-updated", handleSyncUpdate);
    return () => window.removeEventListener("budget-db-updated", handleSyncUpdate);
  }, [db, loadChapters]);

  const displayedChapters = useMemo(() => chapters.filter((c) => !c.isTemporary), [chapters]);
  const copyYearOptions = useMemo(() => {
    if (!copyTargetChapter) return [];
    const baseYear = getChapterYear(copyTargetChapter);
    return buildYearOptions(baseYear);
  }, [copyTargetChapter]);

  const resetSwipeState = () => {
    setSwipeState({ chapterId: null, startX: 0, startY: 0, startOffset: 0, offset: 0, isSwiping: false, isHorizontalSwipe: false });
  };

  const getSwipeOffset = (chapterId) => {
    if (swipeState.isSwiping && swipeState.chapterId === chapterId) return swipeState.offset;
    if (swipedChapterId === chapterId) return -SWIPE_ACTION_WIDTH;
    return 0;
  };

  const mergeDragTransform = (dragTransform, swipeOffset) => {
    if (!dragTransform && !swipeOffset) return undefined;
    if (!dragTransform) return `translateX(${swipeOffset}px)`;
    if (!swipeOffset) return dragTransform;
    return `${dragTransform} translateX(${swipeOffset}px)`;
  };

  const hideSwipe = () => setSwipedChapterId(null);
  const cancelSwipeState = () => {
    resetSwipeState();
  };
  const closeSwipeIfOpen = () => {
    if (swipedChapterId) hideSwipe();
  };

  const handleSwipeStart = (chapterId, e) => {
    const touch = e.touches?.[0];
    if (!touch) return;

    if (swipedChapterId && swipedChapterId !== chapterId) hideSwipe();

    const baseOffset = swipedChapterId === chapterId ? -SWIPE_ACTION_WIDTH : 0;
    setSwipeState({
      chapterId,
      startX: touch.clientX,
      startY: touch.clientY,
      startOffset: baseOffset,
      offset: baseOffset,
      isSwiping: true,
      isHorizontalSwipe: false,
    });
  };

  const handleSwipeMove = (chapterId, e) => {
    if (!swipeState.isSwiping || swipeState.chapterId !== chapterId) return;
    const touch = e.touches?.[0];
    if (!touch) return;

    const moveX = touch.clientX - swipeState.startX;
    const moveY = touch.clientY - swipeState.startY;

    if (!swipeState.isHorizontalSwipe) {
      const absX = Math.abs(moveX);
      const absY = Math.abs(moveY);

      // 세로 스크롤 우선인 터치 동작은 스와이프 취소
      if (absY > absX * 1.5 && absY > SWIPE_DIRECTION_LOCK_THRESHOLD) {
        cancelSwipeState();
        return;
      }

      // 미세 이동은 대기
      if (absX < SWIPE_DIRECTION_LOCK_THRESHOLD) {
        return;
      }

      if (absX <= absY * 1.2) {
        return;
      }

      setSwipeState((prev) => ({ ...prev, isHorizontalSwipe: true }));
    }

    const nextOffset = Math.min(0, Math.max(-SWIPE_ACTION_WIDTH, swipeState.startOffset + moveX));

    setSwipeState((prev) => ({ ...prev, offset: nextOffset }));
  };

  const handleSwipeEnd = (chapterId) => {
    if (!swipeState.isSwiping || swipeState.chapterId !== chapterId) {
      resetSwipeState();
      return;
    }

    if (!swipeState.isHorizontalSwipe) {
      resetSwipeState();
      return;
    }

    if (swipeState.offset <= SWIPE_TRIGGER_OFFSET) {
      setSwipedChapterId(chapterId);
    } else {
      if (swipedChapterId === chapterId) hideSwipe();
    }

    resetSwipeState();
  };

  const handleDragStart = () => {
    closeSwipeIfOpen();
    resetSwipeState();
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const visibleChapters = chapters.filter((c) => !c.isTemporary);
    const reorderedList = reorder(visibleChapters, result.source.index, result.destination.index);
    const tempChapters = chapters.filter((c) => c.isTemporary);
    const nextChapters = [...reorderedList, ...tempChapters];
    setChapters(nextChapters);
    for (let i = 0; i < reorderedList.length; i++) {
      await put("chapters", { ...reorderedList[i], order: i });
    }
  };

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
    const recordsInChapter = await getAllFromIndex("records", "chapterId", chapterId);
    for (let r of recordsInChapter) {
      await deleteItem("records", r.id);
    }
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
    const titleAlreadyExists = allChapters.some((item) => item.title === targetTitle);
    if (titleAlreadyExists) {
      alert("이미 존재하는 챕터입니다.");
      return;
    }

    const recordsInSource = await getAllFromIndex("records", "chapterId", copyTargetChapter.chapterId);
    const targetRecords = recordsInSource
      .filter(isIncomeOrBudgetRecord)
      .sort((a, b) => {
        if (a.order !== b.order) return (a.order ?? 999) - (b.order ?? 999);
        return (toDateSafe(a.date || a.createdAt) - toDateSafe(b.date || b.createdAt));
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

    const nextOrder = chapters.filter((c) => !c.isTemporary).length;
    const newChapterId = await add("chapters", {
      title: targetTitle,
      createdAt: new Date(`${targetYear}-${monthName(targetMonth)}-01`),
      order: nextOrder,
      isTemporary: false,
      isCompleted: false,
    });

    if (!newChapterId) {
      loadChapters();
      closeCopyModal();
      return;
    }

    const recordsToInsert = targetRecords.map((record) => ({
      ...record,
      chapterId: newChapterId,
    }));

    if (recordsToInsert.length > 0) {
      await addMany("records", recordsToInsert, true);
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

  const cancelRenameChapter = () => {
    setEditingChapter(null);
    setEditingTitle("");
  };

  const executeRename = async () => {
    if (!editingChapter) return;

    const nextTitle = editingTitle.trim();
    if (!nextTitle) {
      alert("제목을 입력해 주세요.");
      return;
    }

    const duplicated = chapters.some((c) => c.chapterId !== editingChapter.chapterId && c.title === nextTitle);
    if (duplicated) {
      alert("이미 존재하는 챕터입니다.");
      return;
    }

    await put("chapters", {
      ...editingChapter,
      title: nextTitle,
    });

    cancelRenameChapter();
    window.dispatchEvent(new CustomEvent("budget-db-updated"));
    loadChapters();
  };

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header title="가계부" rightButton={<S.CreateBtn onClick={createTemporaryChapter}>새 내역 추가</S.CreateBtn>} />
      </S.HeaderFix>

      <S.ListWrap onClick={closeSwipeIfOpen} onTouchStart={closeSwipeIfOpen}>
        <DragDropContext onDragEnd={onDragEnd} onDragStart={handleDragStart}>
          <Droppable droppableId="chapterList">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {displayedChapters.map((c, index) => (
                  <Draggable key={c.chapterId} draggableId={String(c.chapterId)} index={index}>
                    {(p, snapshot) => (
                      <DraggablePortal snapshot={snapshot}>
                        <S.SwipeContainer>
                            <S.SwipeContent
                              data-swipe-content="true"
                              ref={p.innerRef}
                              {...p.draggableProps}
                              {...p.dragHandleProps}
                            $isDragging={snapshot.isDragging}
                            $offset={getSwipeOffset(c.chapterId)}
                            style={{
                              ...p.draggableProps.style,
                              // 포탈로 빠져나갔을 때 너비가 0이 되지 않도록 고정 (앱 최대 너비 480px 고려)
                              transform: mergeDragTransform(
                                p.draggableProps.style?.transform,
                                getSwipeOffset(c.chapterId),
                              ),
                              width: snapshot.isDragging ? "calc(100% - 32px)" : "100%",
                              maxWidth: snapshot.isDragging ? "448px" : "none",
                              opacity: c.isCompleted ? 0.65 : 1,
                            }}
                            onTouchStart={(e) => handleSwipeStart(c.chapterId, e)}
                            onTouchMove={(e) => handleSwipeMove(c.chapterId, e)}
                            onTouchEnd={() => handleSwipeEnd(c.chapterId)}
                            onTouchCancel={() => handleSwipeEnd(c.chapterId)}
                            onClick={() => {
                              if (swipedChapterId === c.chapterId) {
                                hideSwipe();
                                return;
                              }
                              if (swipeState.isSwiping && swipeState.chapterId === c.chapterId) return;
                              navigate(`/detail/chapter/${c.chapterId}`);
                            }}
                          >
                            <S.ChapterItem $completed={c.isCompleted}>
                              <S.ChapterLink>{c.title}</S.ChapterLink>
                            </S.ChapterItem>
                          </S.SwipeContent>

                            <S.ActionGroup
                              $isVisible={
                                swipedChapterId === c.chapterId ||
                                (swipeState.chapterId === c.chapterId && swipeState.isSwiping && swipeState.isHorizontalSwipe)
                              }
                              style={{ width: SWIPE_ACTION_WIDTH_PX }}
                              onClick={(e) => e.stopPropagation()}
                            >
                            <button
                              style={{ ...COMPLETE_BUTTON_STYLE, minWidth: 36, justifyContent: "center" }}
                              title={c.isCompleted ? "완료 취소" : "완료 처리"}
                              onClick={() => {
                                hideSwipe();
                                toggleComplete(c);
                              }}
                            >
                              <FiCheckCircle size={12} />
                              {c.isCompleted ? "해제" : "완료"}
                            </button>

                            <button
                              style={{ ...EDIT_BUTTON_STYLE, minWidth: 36, justifyContent: "center" }}
                              title="챕터 제목 수정"
                              onClick={() => {
                                hideSwipe();
                                openRenameChapter(c);
                              }}
                            >
                              <FiEdit3 size={12} />
                              편집
                            </button>

                            <button
                              style={{ ...COPY_BUTTON_STYLE, minWidth: 36, justifyContent: "center" }}
                              title="챕터 복사"
                              onClick={() => {
                                hideSwipe();
                                openCopyModal(c);
                              }}
                            >
                              <FiCopy size={12} />
                              복사
                            </button>

                            <button
                              style={{ ...DELETE_BUTTON_STYLE, minWidth: 36, justifyContent: "center" }}
                              title="삭제"
                              onClick={() => {
                                hideSwipe();
                                deleteChapter(c.chapterId);
                              }}
                            >
                              <FiTrash2 size={12} />
                              삭제
                            </button>
                          </S.ActionGroup>
                        </S.SwipeContainer>
                      </DraggablePortal>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </S.ListWrap>

      {copyTargetChapter &&
        ReactDOM.createPortal(
          <div style={MODAL_OVERLAY_STYLE} onClick={closeCopyModal}>
            <div style={MODAL_STYLE} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: 0, marginBottom: 12, textAlign: "center" }}>챕터 복사</h3>
              <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.5 }}>{copyTargetChapter.title}</p>

              <label style={{ display: "block", marginBottom: 8, fontSize: 14 }}>복사할 월</label>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={copyTargetYear}
                  onChange={(e) => setCopyTargetYear(e.target.value)}
                  style={{
                    width: "38%",
                    borderRadius: 6,
                    border: "1px solid #ddd",
                    padding: 10,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                >
                  {copyYearOptions.length > 0 ? (
                    copyYearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}년
                      </option>
                    ))
                  ) : (
                    <option value={copyTargetYear}>{copyTargetYear}년</option>
                  )}
                </select>
                <select
                  value={copyTargetMonth}
                  onChange={(e) => setCopyTargetMonth(e.target.value)}
                  style={{
                    width: "62%",
                    padding: 10,
                    borderRadius: 6,
                    border: "1px solid #ddd",
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                >
                  {MONTH_OPTIONS.map((month) => (
                    <option key={month} value={month}>
                      {month}월
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ ...MODAL_ROW_STYLE, marginTop: 16 }}>
                <button style={MODAL_BUTTON("#1976d2")} onClick={executeCopy}>
                  복사하기
                </button>
                <button style={MODAL_BUTTON("#6c757d")} onClick={closeCopyModal}>
                  취소
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {editingChapter &&
        ReactDOM.createPortal(
          <div style={MODAL_OVERLAY_STYLE} onClick={cancelRenameChapter}>
            <div style={MODAL_STYLE} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: 0, marginBottom: 12, textAlign: "center" }}>챕터 제목 수정</h3>
              <p style={{ margin: "0 0 12px", fontSize: 13, lineHeight: 1.5 }}>{editingChapter.title} →</p>
              <input
                value={editingTitle}
                onChange={(e) => setEditingTitle(e.target.value)}
                style={{
                  width: "100%",
                  border: "1px solid #ddd",
                  borderRadius: 6,
                  padding: 10,
                  marginBottom: 12,
                  boxSizing: "border-box",
                }}
                placeholder="새 제목 입력"
              />

              <div style={MODAL_ROW_STYLE}>
                <button style={MODAL_BUTTON("#1976d2")} onClick={executeRename}>
                  저장
                </button>
                <button style={MODAL_BUTTON("#6c757d")} onClick={cancelRenameChapter}>
                  취소
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </S.PageWrap>
  );
}
