import styled from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { initDB } from '../db/indexedDB';
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

export default function SettingsPage({ setMode, mode }) {
  const navigate = useNavigate();

  const resetAll = async () => {
    const c = window.confirm("정말 초기화 하시겠습니까?");
    if (!c) return;

    const db = await initDB();
    await db.clear("chapters");
    await db.clear("records");

    alert("전체 초기화 완료되었습니다.");
  };

  return (
    <PageWrap>

      {/* 고정 헤더 */}
      <HeaderFix>
        <Header title="설정" />
      </HeaderFix>

      {/* 스크롤 콘텐츠 */}
      <Content>

        <Btn onClick={() => navigate("/settings/currency")}>
          금액 기호 설정하기
        </Btn>

        <Btn onClick={() => setMode(mode === "light" ? "dark" : "light")}>
          테마 변경 (현재: {mode === "light" ? "라이트모드" : "다크모드"})
        </Btn>

        <Btn onClick={resetAll} style={{ background: "#d9534f" }}>
          전체 데이터 초기화
        </Btn>

      </Content>
    </PageWrap>
  );
}
