import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/UI/Header";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
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

  // ★ subscribe 추가 (loadChapters는 이제 필요 없음)
  const { db, subscribe, getAllFromIndex, add, deleteItem, put } = useBudgetDB();

  // ★ 실시간 구독 (데이터가 바뀌면 알아서 실행됨)
  useEffect(() => {
    // 'chapters' 컬렉션을 구독
    const unsubscribe = subscribe("chapters", (list) => {
      // 받아온 리스트 정렬
      const sortedList = list.sort((a, b) => {
        if (a.order !== b.order) {
          return (a.order ?? 999) - (b.order ?? 999);
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
      setChapters(sortedList);
    });

    // 컴포넌트가 꺼질 때 구독 취소
    return () => unsubscribe && unsubscribe();
  }, [subscribe]);

  const displayedChapters = useMemo(() => chapters.filter((c) => !c.isTemporary), [chapters]);

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    // UI 먼저 업데이트 (Optimistic UI)
    const reorderedList = reorder(displayedChapters, result.source.index, result.destination.index);
    const temps = chapters.filter((c) => c.isTemporary);
    setChapters([...reorderedList, ...temps]);

    // DB에 순서 저장
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
    // await loadChapters(); <--- 이거 필요 없음! subscribe가 알아서 함
    navigate(`/detail/chapter/${id}`);
  };

  const deleteChapter = async (chapterId) => {
    if (!window.confirm("해당 기록을 삭제하시겠습니까?")) return;

    // 1. 챕터 삭제 (Soft Delete)
    await deleteItem("chapters", chapterId);

    // 2. 하위 레코드들 삭제
    const recordsInChapter = await getAllFromIndex("records", "chapterId", Number(chapterId));

    for (let r of recordsInChapter) {
      await deleteItem("records", r.id);
    }
    // loadChapters(); <--- 필요 없음!
  };

  const handlePressStart = (chapterId) => {
    pressTimerRef.current = setTimeout(() => setPressedId(chapterId), 600);
  };

  const handlePressEnd = () => clearTimeout(pressTimerRef.current);

  const toggleComplete = async (chapter) => {
    await put("chapters", { ...chapter, isCompleted: !chapter.isCompleted });
    setPressedId(null);
    // loadChapters(); <--- 필요 없음!
  };

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header title="가계부" rightButton={<S.CreateBtn onClick={createTemporaryChapter}>새 내역 추가</S.CreateBtn>} />
      </S.HeaderFix>
      <S.ListWrap>
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
                        onMouseDown={() => handlePressStart(c.chapterId)}
                        onMouseUp={handlePressEnd}
                        onMouseLeave={handlePressEnd}
                        onTouchStart={() => handlePressStart(c.chapterId)}
                        onTouchEnd={handlePressEnd}
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
