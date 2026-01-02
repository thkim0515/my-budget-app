import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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

export default function MainPage() {
  const [chapters, setChapters] = useState([]);
  const [pressedId, setPressedId] = useState(null);
  const pressTimerRef = useRef(null);
  const navigate = useNavigate();
  const { db, getAll, getAllFromIndex, add, deleteItem, put } = useBudgetDB();
  const { syncWithFirestore, isSyncing } = useSync();

  // --- 당겨서 새로고침 상태 ---
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

  // --- 터치 이벤트 핸들러 ---
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
    loadChapters();
  };

  const toggleComplete = async (chapter) => {
    await put("chapters", { ...chapter, isCompleted: !chapter.isCompleted });
    setPressedId(null);
    loadChapters();
  };

  return (
    <S.PageWrap onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      {/* StatsPage와 일치시킨 고정 헤더 영역 */}
      <S.HeaderFix>
        <Header title="가계부" rightButton={<S.CreateBtn onClick={createTemporaryChapter}>새 내역 추가</S.CreateBtn>} />
      </S.HeaderFix>

      {/* 새로고침 인디케이터 */}
      <S.RefreshIndicator $pullDistance={pullDistance} $isRefreshing={isSyncing}>
        <FiRefreshCw />
      </S.RefreshIndicator>

      {/* 리스트 래퍼 */}
      <S.ListWrap
        $pullDistance={pullDistance}
        $isRefreshing={isPullRefreshing}
        style={{
          transform: `translateY(${pullDistance}px)`,
        }}
      >
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="chapterList">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {displayedChapters.map((c, index) => (
                  <Draggable key={c.chapterId} draggableId={String(c.chapterId)} index={index}>
                    {(provided, snapshot) => (
                      <S.ChapterItem
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        $completed={c.isCompleted}
                        style={{ ...provided.draggableProps.style, opacity: snapshot.isDragging ? 0.7 : 1 }}
                        onMouseDown={() => (pressTimerRef.current = setTimeout(() => setPressedId(c.chapterId), 600))}
                        onMouseUp={() => clearTimeout(pressTimerRef.current)}
                        onMouseLeave={() => clearTimeout(pressTimerRef.current)}
                        onTouchStart={() => (pressTimerRef.current = setTimeout(() => setPressedId(c.chapterId), 600))}
                        onTouchEnd={() => clearTimeout(pressTimerRef.current)}
                        onClick={() => (pressedId === c.chapterId ? null : navigate(`/detail/chapter/${c.chapterId}`))}
                      >
                        <S.ChapterLink>{c.title}</S.ChapterLink>
                        {pressedId === c.chapterId && (
                          <S.CompleteBtn
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleComplete(c);
                            }}
                          >
                            {c.isCompleted ? "취소" : "완료"}
                          </S.CompleteBtn>
                        )}
                        <S.DeleteBtn
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteChapter(c.chapterId);
                          }}
                        >
                          삭제
                        </S.DeleteBtn>
                      </S.ChapterItem>
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
