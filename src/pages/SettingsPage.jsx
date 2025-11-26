import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import Header from "../components/Header";
import { useBudgetDB } from '../hooks/useBudgetDB';

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

const Content = styled.div`
  flex: 1;
  overflow-y: auto;

  padding: 16px;
  padding-top: 96px;
  padding-bottom: 100px;

  width: 100%;
  max-width: 480px;
  margin: 0 auto;
`;

const Btn = styled.button`
  width: 100%;
  padding: 12px;
  margin-bottom: 12px;
  border: none;
  border-radius: 6px;
  background: #1976d2;
  color: white;
`;

const SectionTitle = styled.h3`
  color: ${({ theme }) => theme.text};
  margin-top: 20px;
  margin-bottom: 12px;
`;

export default function SettingsPage({ setMode, mode }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // DB 훅
  const { db, getAll, clear } = useBudgetDB();

  // 전체 초기화
  const resetAll = async () => {
    const c = window.confirm("정말 초기화 하시겠습니까?");
    if (!c) return;

    await clear("chapters");
    await clear("records");

    alert("전체 초기화 완료되었습니다.");
  };

  // 데이터 백업 (다운로드)
  const backupData = async () => {
    const chapters = await getAll('chapters');
    const records = await getAll('records');

    const data = {
      chapters,
      records,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    a.href = url;
    a.download = `budget_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();

    URL.revokeObjectURL(url);
  };

  // 데이터 복구
  const restoreData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ok = window.confirm(
      "현재 데이터가 모두 삭제되고 백업 파일로 덮어씌워집니다. 진행하시겠습니까?"
    );
    if (!ok) {
      e.target.value = '';
      return;
    }

    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);

        if (!data.chapters || !data.records) {
          throw new Error("올바르지 않은 백업 파일입니다.");
        }

        if (!db) return;

        await clear('chapters');
        await clear('records');

        // 트랜잭션 복구
        const tx = db.transaction(['chapters', 'records'], 'readwrite');

        const chapterStore = tx.objectStore('chapters');
        const recordStore = tx.objectStore('records');

        for (const ch of data.chapters) {
          chapterStore.put(ch);
        }
        for (const rec of data.records) {
          recordStore.put(rec);
        }

        await tx.done;

        alert("복구가 완료되었습니다.");
      } catch (err) {
        alert("복구 실패: " + err.message);
      }
    };

    reader.readAsText(file);
  };

  return (
    <PageWrap>
      <HeaderFix>
        <Header title="설정" />
      </HeaderFix>

      <Content>

        <Btn onClick={() => navigate("/settings/currency")}>
          금액 기호 설정하기
        </Btn>

        <Btn onClick={() => setMode(mode === "light" ? "dark" : "light")}>
          테마 변경 (현재: {mode === "light" ? "라이트모드" : "다크모드"})
        </Btn>

        <hr style={{ margin: '20px 0', border: 0, borderTop: '1px solid #ddd' }} />

        <SectionTitle>데이터 관리</SectionTitle>

        <Btn onClick={backupData} style={{ background: "#28a745" }}>
          데이터 백업 (다운로드)
        </Btn>

        <Btn onClick={() => fileInputRef.current.click()} style={{ background: "#17a2b8" }}>
          데이터 복구 (파일 불러오기)
        </Btn>

        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={restoreData}
        />

        <Btn onClick={resetAll} style={{ background: "#d9534f", marginTop: "20px" }}>
          전체 데이터 초기화
        </Btn>

      </Content>
    </PageWrap>
  );
}
