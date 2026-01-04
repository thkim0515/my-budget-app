/* src/pages/Main/MainPage.jsx */
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import ReactDOM from "react-dom";
import { useNavigate } from "react-router-dom";
import Header from "../../components/UI/Header";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { useSync } from "../../hooks/useSync";
import { auth } from "../../db/firebase";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { FiRefreshCw } from "react-icons/fi";
import * as S from "./MainPage.styles";

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

// 드래그 중인 요소를 Portal로 띄워주기 위한 헬퍼 컴포넌트
const DraggablePortal = ({ children, snapshot }) => {
  if (!snapshot.isDragging) return children;
  return ReactDOM.createPortal(children, document.body);
};

export default function MainPage() {
  const [chapters, setChapters] = useState([]);
  const [pressedId, setPressedId] = useState(null);
  const pressTimerRef = useRef(null);
  const navigate = useNavigate();
  const { db, getAll, getAllFromIndex, add, deleteItem, put } = useBudgetDB();
  const { syncWithFirestore, isSyncing } = useSync();

  const [pullDistance, setPullDistance] = useState(0);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const startY = useRef(0);

  const loadChapters = useCallback(async () => {
    if (!db) return;
    const list = await getAll("chapters");
    list.sort((a, b) => {
      if (a.order !== b.order) return (a.order ?? 999) - (b.order ?? 999);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    setChapters(list);
  }, [db, getAll]);

  const handleRefresh = async () => {
    if (auth.currentUser) {
      await syncWithFirestore(auth.currentUser.uid);
    }
  };

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) startY.current = e.touches[0].pageY;
  };

  const handleTouchMove = (e) => {
    if (startY.current === 0 || isSyncing) return;
    const currentY = e.touches[0].pageY;
    const distance = currentY - startY.current;
    if (distance > 0) setPullDistance(distance * 0.4);
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isSyncing) {
      setIsPullRefreshing(true);
      setPullDistance(60);
      await handleRefresh();
      setTimeout(() => {
        setIsPullRefreshing(false);
        setPullDistance(0);
      }, 500);
    } else {
      setPullDistance(0);
    }
    startY.current = 0;
  };

  useEffect(() => {
    loadChapters();
    const handleSyncUpdate = () => loadChapters();
    window.addEventListener("budget-db-updated", handleSyncUpdate);
    return () => window.removeEventListener("budget-db-updated", handleSyncUpdate);
  }, [db, loadChapters]);

  const displayedChapters = useMemo(() => chapters.filter((c) => !c.isTemporary), [chapters]);

  // 드래그 시작 시 관리 모드 해제
  const onDragStart = () => {
    setPressedId(null);
  };

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    const reorderedList = reorder(displayedChapters, result.source.index, result.destination.index);
    const temps = chapters.filter((c) => c.isTemporary);
    setChapters([...reorderedList, ...temps]);
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
    for (let r of recordsInChapter) await deleteItem("records", r.id);
    setPressedId(null);
    loadChapters();
  };

  const toggleComplete = async (chapter) => {
    await put("chapters", { ...chapter, isCompleted: !chapter.isCompleted });
    setPressedId(null);
    loadChapters();
  };

  return (
    <S.PageWrap onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <S.HeaderFix>
        <Header title="가계부" rightButton={<S.CreateBtn onClick={createTemporaryChapter}>새 내역 추가</S.CreateBtn>} />
      </S.HeaderFix>

      <S.RefreshIndicator $pullDistance={pullDistance} $isRefreshing={isSyncing}>
        <FiRefreshCw />
      </S.RefreshIndicator>

      <S.ListWrap
        $pullDistance={pullDistance}
        $isRefreshing={isPullRefreshing}
        style={{
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        <DragDropContext onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <Droppable droppableId="chapterList">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {displayedChapters.map((c, index) => (
                  <Draggable key={c.chapterId} draggableId={String(c.chapterId)} index={index}>
                    {(p, snapshot) => (
                      <DraggablePortal snapshot={snapshot}>
                        <S.ChapterItem
                          ref={p.innerRef}
                          {...p.draggableProps}
                          {...p.dragHandleProps}
                          $completed={c.isCompleted}
                          $isDragging={snapshot.isDragging}
                          $isPressed={pressedId === c.chapterId}
                          style={{
                            ...p.draggableProps.style,
                            // 포탈로 빠져나갔을 때 너비가 0이 되지 않도록 고정 (앱 최대 너비 480px 고려)
                            width: snapshot.isDragging ? "calc(100% - 32px)" : "100%",
                            maxWidth: snapshot.isDragging ? "448px" : "none",
                          }}
                          onMouseDown={() => (pressTimerRef.current = setTimeout(() => setPressedId(c.chapterId), 600))}
                          onMouseUp={() => clearTimeout(pressTimerRef.current)}
                          onMouseLeave={() => clearTimeout(pressTimerRef.current)}
                          onTouchStart={() => (pressTimerRef.current = setTimeout(() => setPressedId(c.chapterId), 600))}
                          onTouchEnd={() => clearTimeout(pressTimerRef.current)}
                          onClick={() => (pressedId === c.chapterId ? null : navigate(`/detail/chapter/${c.chapterId}`))}
                        >
                          {pressedId === c.chapterId ? (
                            <S.ActionGroup onClick={(e) => e.stopPropagation()}>
                              <S.CompleteBtn
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleComplete(c);
                                }}
                              >
                                {c.isCompleted ? "미완료" : "완료"}
                              </S.CompleteBtn>
                              <S.DeleteBtn
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteChapter(c.chapterId);
                                }}
                              >
                                삭제
                              </S.DeleteBtn>
                              <S.CloseBtn
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPressedId(null);
                                }}
                              >
                                닫기
                              </S.CloseBtn>
                            </S.ActionGroup>
                          ) : (
                            <S.ChapterLink>{c.title}</S.ChapterLink>
                          )}
                        </S.ChapterItem>
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
    </S.PageWrap>
  );
}
