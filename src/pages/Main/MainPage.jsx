import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../components/Header";
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
  const navigate = useNavigate();
  const { db, getAll, add, deleteItem, put } = useBudgetDB();

  // 1. 데이터 로드 및 정렬 로직
  const loadChapters = useCallback(async () => {
    const list = await getAll("chapters");
    
    // 1순위: order (사용자가 지정한 순서)
    // 2순위: createdAt (생성 시간 역순 - 최신순)
    list.sort((a, b) => {
      if (a.order !== b.order) {
        return (a.order ?? 999) - (b.order ?? 999);
      }
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
    
    setChapters(list);
  }, [getAll]);

  useEffect(() => {
    if (db) loadChapters();
  }, [db, loadChapters]);

  // 2. 필터링된 목록 (임시 항목 제외)
  // 드래그 대상과 실제 렌더링 대상의 인덱스를 일치시키기 위해 useMemo 사용
  const displayedChapters = useMemo(() => 
    chapters.filter((c) => !c.isTemporary), 
  [chapters]);

  // 3. 드래그 완료 시 처리
  const onDragEnd = async (result) => {
    if (!result.destination) return;

    // 현재 보여지는 목록 내에서 재배치
    const reorderedList = reorder(
      displayedChapters,
      result.source.index,
      result.destination.index
    );

    // 로컬 상태 즉시 업데이트 (사용자 경험 향상)
    // 임시 항목들은 뒤에 붙여두거나 순서를 유지함
    const temps = chapters.filter(c => c.isTemporary);
    setChapters([...reorderedList, ...temps]);

    // DB에 새로운 순서(order) 저장
    // 이제 모든 항목이 명시적인 order 값을 갖게 되어 기본 정렬을 무시하게 됨
    for (let i = 0; i < reorderedList.length; i++) {
      const target = reorderedList[i];
      await put("chapters", { ...target, order: i });
    }
    
    console.log("순서 고정 완료");
  };

  const createTemporaryChapter = async () => {
    const newDate = new Date();
    const tempTitle = `_TEMP_${newDate.getTime()}`;

    const id = await add("chapters", {
      title: tempTitle,
      createdAt: newDate,
      // 새 항목은 맨 아래 혹은 맨 위로 (기본값은 최신순 정렬에 의해 위로 감)
      order: 999, 
      isTemporary: true,
    });

    await loadChapters();
    navigate(`/detail/chapter/${id}`);
  };

  const deleteChapter = async (chapterId) => {
    if (!window.confirm("해당 기록을 삭제하시겠습니까?")) return;

    await deleteItem("chapters", chapterId);
    const allRecords = await getAll("records");
    const toDelete = allRecords.filter((r) => r.chapterId === chapterId);

    for (let r of toDelete) {
      await deleteItem("records", r.id);
    }

    loadChapters();
  };

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header
          title="가계부"
          rightButton={
            <S.CreateBtn onClick={createTemporaryChapter}>
              새 내역 추가
            </S.CreateBtn>
          }
        />
      </S.HeaderFix>

      <S.ListWrap>
        {displayedChapters.length === 0 && (
          <S.EmptyWrap>
            <S.EmptyMessage>새로운 가계부를 작성해 보세요</S.EmptyMessage>
          </S.EmptyWrap>
        )}

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="chapterList">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {displayedChapters.map((c, index) => (
                  <Draggable
                    key={c.chapterId}
                    draggableId={String(c.chapterId)}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <S.ChapterItem
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...provided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.7 : 1,
                        }}
                        onClick={() => navigate(`/detail/chapter/${c.chapterId}`)}
                      >
                        <S.ChapterLink>{c.title}</S.ChapterLink>
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