import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styled from "styled-components";
import Header from "../components/Header";
// 임시로 제거한 모달 import
// import CreateChapterModal from "../components/CreateChapterModal";
import { useBudgetDB } from "../hooks/useBudgetDB";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

// 페이지의 전체 레이아웃을 담당하는 래퍼
const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
`;

// 상단 헤더를 고정시키는 영역
const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: 480px;
  z-index: 20;
`;

// 챕터 목록을 담는 스크롤 영역
const ListWrap = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-top: 100px;
  padding: 0 16px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
`;

// 새 챕터 생성 버튼 스타일
const CreateBtn = styled.button`
  background: #1976d2;
  color: white;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
`;

// 각 챕터 아이템 스타일
const ChapterItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 16px;
  background: ${({ theme }) => theme.card};
  border-radius: 6px;
  margin-bottom: 12px;
  border: 1px solid ${({ theme }) => theme.border};
  transition: background 0.15s, transform 0.15s;

  &:active {
    background: rgba(0, 0, 0, 0.12);
    transform: scale(0.98);
  }

  cursor: pointer;
`;

// 챕터 제목 링크 스타일
const ChapterLink = styled.span`
  flex: 1;
  text-decoration: none;
  color: ${({ theme }) => theme.text};
`;

// 삭제 버튼 스타일
const DeleteBtn = styled.button`
  background: #d9534f;
  color: white;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  margin-left: 10px;
`;

// 빈 목록일 때 메시지를 감싸는 영역
const EmptyWrap = styled.div`
  height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

// 빈 목록 메시지 텍스트 스타일
const EmptyMessage = styled.div`
  font-size: 18px;
  color: ${({ theme }) => theme.text};
  opacity: 0.7;
`;

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
    <PageWrap>
      <HeaderFix>
        <Header
          title="가계부"
          rightButton={
            // 새 임시 챕터를 생성하는 버튼
            <CreateBtn onClick={createTemporaryChapter}>새 내역 추가</CreateBtn>
          }
        />
      </HeaderFix>

      <ListWrap>
        {/* 임시 챕터를 제외한 목록이 비어 있는지 판단 */}
        {chapters.filter((c) => !c.isTemporary).length === 0 && (
          <EmptyWrap>
            <EmptyMessage>새로운 가계부를 작성해 보세요</EmptyMessage>
          </EmptyWrap>
        )}

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="chapterList">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {chapters
                  .filter((c) => !c.isTemporary)
                  .map((c, index) => (
                    <Draggable key={c.chapterId} draggableId={String(c.chapterId)} index={index}>
                      {(provided, snapshot) => (
                        <ChapterItem
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          style={{
                            ...provided.draggableProps.style,
                            opacity: snapshot.isDragging ? 0.7 : 1,
                          }}
                          onClick={() => navigate(`/detail/chapter/${c.chapterId}`)}
                        >
                          <ChapterLink>{c.title}</ChapterLink>

                          <DeleteBtn
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChapter(c.chapterId);
                            }}
                          >
                            삭제
                          </DeleteBtn>
                        </ChapterItem>
                      )}
                    </Draggable>
                  ))}

                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </ListWrap>

      {/* create chapter modal은 현재 사용되지 않음 */}
      {/* {openModal && <CreateChapterModal onClose={() => setOpenModal(false)} onSubmit={createNewChapter} />} */}
    </PageWrap>
  );
}
