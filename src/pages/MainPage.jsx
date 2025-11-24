import { useEffect, useState } from 'react';
import { initDB } from '../db/indexedDB';
import { Link, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import Header from "../components/Header";

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
  margin-top: 80px;         
  padding: 0 16px;
  padding-bottom: 100px;    
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

  padding: 14px;
  background: ${({ theme }) => theme.card};
  border-radius: 6px;
  margin-bottom: 10px;
  border: 1px solid ${({ theme }) => theme.border};
`;

const ChapterLink = styled(Link)`
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

export default function MainPage() {
  const [chapters, setChapters] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    const db = await initDB();
    const list = await db.getAll('chapters');
    setChapters(list);
  };

  const createNewChapter = async () => {
    const title = prompt("대제목을 입력하세요 (예: 1월)");
    if (!title || !title.trim()) return;

    const db = await initDB();
    const id = await db.add("chapters", {
      title,
      createdAt: new Date()
    });

    loadChapters();
    navigate(`/detail/${id}`);
  };

  const deleteChapter = async (chapterId) => {
    const confirmDelete = window.confirm("해당 기록을 삭제하시겠습니까?");
    if (!confirmDelete) return;

    const db = await initDB();
    await db.delete("chapters", chapterId);

    const allRecords = await db.getAll('records');
    const toDelete = allRecords.filter(r => r.chapterId === chapterId);

    for (let r of toDelete) {
      await db.delete("records", r.id);
    }

    loadChapters();
  };

  return (
    <PageWrap>

      {/* 헤더 고정 */}
      <HeaderFix>
        <Header
          title="가계부"
          rightButton={
            <CreateBtn onClick={createNewChapter}>새로 만들기</CreateBtn>
          }
        />
      </HeaderFix>

      {/* 리스트 스크롤 영역 */}
      <ListWrap>

        {chapters.length === 0 && (
          <EmptyWrap>
            <EmptyMessage>새로운 가계부를 작성해 보세요!</EmptyMessage>
          </EmptyWrap>
        )}

        {chapters.map((c) => (
          <ChapterItem key={c.chapterId}>
            <ChapterLink to={`/detail/${c.chapterId}`}>
              {c.title}
            </ChapterLink>

            <DeleteBtn onClick={() => deleteChapter(c.chapterId)}>
              삭제
            </DeleteBtn>
          </ChapterItem>
        ))}

      </ListWrap>

    </PageWrap>
  );
}
