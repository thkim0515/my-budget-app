import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { useRef } from 'react';
import Header from "../components/Header";
import { useBudgetDB } from '../hooks/useBudgetDB';
import { DEFAULT_CATEGORIES } from "../constants/categories";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { PermissionsAndroid } from "@capacitor/core";


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
  padding-bottom: calc(160px + env(safe-area-inset-bottom));

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

  const { db, getAll, clear } = useBudgetDB();

  const requestPermission = async () => {
    const perm = await Filesystem.requestPermissions();
    return perm.publicStorage === "granted";
  };

  
  const resetAll = async () => {
    const c = window.confirm("정말 초기화 하시겠습니까?");
    if (!c) return;

    await clear("chapters");
    await clear("records");
    await clear("categories");

    // 기본 카테고리 자동 복원
    const tx = db.transaction("categories", "readwrite");
    const store = tx.objectStore("categories");

    DEFAULT_CATEGORIES.forEach(name => {
      store.add({ name });
    });

    await tx.done;

    alert("전체 초기화 완료되었습니다.");
  };


  const backupData = async () => {
    const granted = await requestPermission();
    if (!granted) {
      alert("파일 저장 권한이 필요합니다.");
      return;
    }

    const chapters = await getAll("chapters");
    const records = await getAll("records");
    const categories = await getAll("categories");

    const data = {
      chapters,
      records,
      categories,
      exportedAt: new Date().toISOString(),
    };

    await Filesystem.writeFile({
      path: `budget_backup_${new Date().toISOString().slice(0, 10)}.json`,
      data: JSON.stringify(data, null, 2),
      directory: Directory.Documents, // Downloads 대신 Documents 사용 권장
      encoding: Encoding.UTF8,
    });

    alert("백업 파일이 저장되었습니다. 파일 관리 앱에서 확인할 수 있습니다.");
  };


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
      let data;

      try {
        data = JSON.parse(event.target.result);
      } catch (err) {
        alert("백업 파일을 읽는 중 문제가 발생했습니다.");
        return;
      }

      // JSON 형식 검증
      if (!data.chapters || !data.records || !data.categories) {
        alert("잘못된 백업 파일입니다.");
        return;
      }

      await clear('chapters');
      await clear('records');
      await clear('categories');

      const tx = db.transaction(['chapters', 'records', 'categories'], 'readwrite');

      const chapterStore = tx.objectStore('chapters');
      const recordStore = tx.objectStore('records');
      const categoryStore = tx.objectStore('categories');

      data.chapters.forEach(c => chapterStore.put(c));
      data.records.forEach(r => recordStore.put(r));
      data.categories.forEach(cat => categoryStore.put(cat));

      await tx.done;
      alert("복구 완료되었습니다.");
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

        <Btn onClick={() => navigate("/settings/categories")}>
          카테고리 관리
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
