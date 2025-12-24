import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header";
// 임시로 제거한 모달 import
// import CreateChapterModal from "../components/CreateChapterModal";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

import * as S from './MainPage.styles'

// 드래그 정렬을 위한 배열 재배치 함수
const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};

// 메인 페이지 컴포넌트
export default function MainPage() {
  const [chapters, setChapters] = useState([]); // 챕터 리스트 상태
  // const [openModal, setOpenModal] = useState(false);

  const navigate = useNavigate(); // 페이지 이동 함수

  const { db, getAll, add, deleteItem, put } = useBudgetDB(); // 데이터베이스 접근 훅

  // 데이터베이스가 준비되면 챕터 목록을 로드
  useEffect(() => {
    if (db) {
      loadChapters();
    }
  }, [db]);

  // 챕터 목록을 가져와 정렬하여 상태에 저장
  const loadChapters = async () => {
    const list = await getAll("chapters");
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setChapters(list);
  };

  // 드래그 정렬 완료 시 실행되는 정렬 함수
  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const newOrder = reorder(chapters, result.source.index, result.destination.index);

    setChapters(newOrder);

    for (let i = 0; i < newOrder.length; i++) {
      const c = newOrder[i];
      await put("chapters", { ...c, order: i });
    }
  };

  // 임시 챕터를 생성하고 상세 페이지로 이동하는 기능
  const createTemporaryChapter = async () => {
    const newDate = new Date();
    const tempTitle = `_TEMP_${newDate.getTime()}`;

    const id = await add("chapters", {
      title: tempTitle,
      createdAt: newDate,
      order: chapters.length,
      isTemporary: true,
    });

    loadChapters();
    navigate(`/detail/chapter/${id}`);
  };

  // 챕터 삭제 기능 모든 관련 기록도 함께 삭제
  const deleteChapter = async (chapterId) => {
    const confirmDelete = window.confirm("해당 기록을 삭제하시겠습니까?");
    if (!confirmDelete) return;

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
            // 새 임시 챕터를 생성하는 버튼
            <S.CreateBtn onClick={createTemporaryChapter}>
              새 내역 추가
            </S.CreateBtn>
          }
        />
      </S.HeaderFix>

      <S.ListWrap>
        {/* 임시 챕터를 제외한 목록이 비어 있는지 판단 */}
        {chapters.filter((c) => !c.isTemporary).length === 0 && (
          <S.EmptyWrap>
            <S.EmptyMessage>새로운 가계부를 작성해 보세요</S.EmptyMessage>
          </S.EmptyWrap>
        )}

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="chapterList">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {chapters
                  .filter((c) => !c.isTemporary)
                  .map((c, index) => (
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
                          onClick={() =>
                            navigate(`/detail/chapter/${c.chapterId}`)
                          }
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

      {/* create chapter modal은 현재 사용되지 않음 */}
      {/* {openModal && <CreateChapterModal onClose={() => setOpenModal(false)} onSubmit={createNewChapter} />} */}
    </S.PageWrap>
  );

 
}
