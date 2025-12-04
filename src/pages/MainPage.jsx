import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import Header from "../components/Header";
import CreateChapterModal from "../components/CreateChapterModal";
import { useBudgetDB } from '../hooks/useBudgetDB';
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
`;

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

const ListWrap = styled.div`
  flex: 1;
  overflow-y: auto;
  margin-top: 100px; // 기존 80px → 100px 등으로 수정
  padding: 0 16px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
`;


const CreateBtn = styled.button`
  background: #1976d2;
  color: white;
  padding: 8px 14px;
  border: none;
  border-radius: 6px;
`;

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


const ChapterLink = styled.span`
  flex: 1;
  text-decoration: none;
  color: ${({ theme }) => theme.text};
`;



const DeleteBtn = styled.button`
  background: #d9534f;
  color: white;
  border: none;
  padding: 6px 10px;
  border-radius: 6px;
  margin-left: 10px;
`;

const EmptyWrap = styled.div`
  height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const EmptyMessage = styled.div`
  font-size: 18px;
  color: ${({ theme }) => theme.text};
  opacity: 0.7;
`;

const reorder = (list, startIndex, endIndex) => {
  const result = Array.from(list);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);
  return result;
};


export default function MainPage() {
  const [chapters, setChapters] = useState([]);
  const [openModal, setOpenModal] = useState(false);

  const navigate = useNavigate();

  // 훅 적용
  const { db, getAll, add, deleteItem, put } = useBudgetDB();


  // DB 준비되면 로드
  useEffect(() => {
    if (db) {
      loadChapters();
    }
  }, [db]);

  const loadChapters = async () => {
    const list = await getAll('chapters');
    list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    setChapters(list);
  };


  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const newOrder = reorder(
      chapters,
      result.source.index,
      result.destination.index
    );

    setChapters(newOrder);

    for (let i = 0; i < newOrder.length; i++) {
      const c = newOrder[i];
      await put("chapters", { ...c, order: i });
    }
  };



  const createNewChapter = async (title) => {
    if (!title.trim()) return;

    const id = await add("chapters", {
      title,
      createdAt: new Date(),
      order: chapters.length
    });

    loadChapters();
    navigate(`/detail/chapter/${id}`);
    setOpenModal(false);
  };


  const deleteChapter = async (chapterId) => {
    const confirmDelete = window.confirm("해당 기록을 삭제하시겠습니까?");
    if (!confirmDelete) return;

    await deleteItem("chapters", chapterId);

    const allRecords = await getAll('records');
    const toDelete = allRecords.filter(r => r.chapterId === chapterId);

    for (let r of toDelete) {
      await deleteItem("records", r.id);
    }

    loadChapters();
  };

  return (
    <PageWrap>
      <HeaderFix>
        <Header title="가계부" rightButton={<CreateBtn onClick={() => setOpenModal(true)}>새로 만들기</CreateBtn>} />
      </HeaderFix>

      <ListWrap>
        {chapters.length === 0 && (
          <EmptyWrap>
            <EmptyMessage>새로운 가계부를 작성해 보세요!</EmptyMessage>
          </EmptyWrap>
        )}

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="chapterList">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {chapters.map((c, index) => (
                  <Draggable
                    key={c.chapterId}
                    draggableId={String(c.chapterId)}
                    index={index}
                  >
                    {(provided, snapshot) => (
                      <ChapterItem

                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...provided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.7 : 1
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

      {openModal && <CreateChapterModal onClose={() => setOpenModal(false)} onSubmit={createNewChapter} />}
    </PageWrap>
  );
}
