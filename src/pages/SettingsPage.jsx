// 페이지 전체 레이아웃을 구성하는 컨테이너
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import Header from "../components/Header";
import { useBudgetDB } from "../hooks/useBudgetDB";
import { DEFAULT_CATEGORIES } from "../constants/categories";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";

// 기본 페이지 레이아웃
const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
`;

// 고정된 상단 헤더 영역
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

// 스크롤 가능한 본문 영역
const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-top: 96px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
`;

// 설정 버튼 스타일
const Btn = styled.button`
  width: 100%;
  padding: 12px;
  margin-bottom: 12px;
  border: none;
  border-radius: 6px;
  background: #1976d2;
  color: white;
  font-size: 15px;
`;

// 섹션 제목 스타일
const SectionTitle = styled.h3`
  color: ${({ theme }) => theme.text};
  margin-top: 20px;
  margin-bottom: 12px;
`;

// 토글 스위치 행
const ToggleRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  margin-bottom: 12px;
  color: ${({ theme }) => theme.text};
`;

// 토글 스위치 스타일 구성
const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 50px;
  height: 26px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #ccc;
    transition: 0.4s;
    border-radius: 34px;
  }

  span:before {
    position: absolute;
    content: "";
    height: 20px;
    width: 20px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: 0.4s;
    border-radius: 50%;
  }

  input:checked + span {
    background-color: #1976d2;
  }

  input:checked + span:before {
    transform: translateX(24px);
  }
`;

// 설정 페이지 컴포넌트
export default function SettingsPage({ setMode, mode }) {
  const navigate = useNavigate(); // 페이지 이동용 네비게이션 훅
  const fileInputRef = useRef(null); // 파일 업로드 input 참조

  const { db, getAll, clear } = useBudgetDB(); // 앱 데이터베이스 접근 훅

  const [useBiometric, setUseBiometric] = useState(false); // 생체 인증 설정 상태

  // 저장된 생체 인증 설정 불러오기
  useEffect(() => {
    const saved = localStorage.getItem("useBiometric") === "true";
    setUseBiometric(saved);
  }, []);

  // 생체 인증 활성화나 비활성화 처리
  const toggleBiometric = async (e) => {
    const isChecked = e.target.checked;

    if (isChecked) {
      try {
        const result = await NativeBiometric.isAvailable(); // 기기 지원 여부 확인

        if (!result.isAvailable) {
          alert("이 기기는 생체 인식을 지원하지 않습니다.");
          setUseBiometric(false);
          return;
        }

        await NativeBiometric.verifyIdentity({
          reason: "지문 인식 기능을 활성화합니다.",
          title: "본인 인증",
          subtitle: "지문 또는 얼굴을 인식해주세요",
          description: "설정을 변경하기 위해 인증이 필요합니다.",
        }); // 생체 인증 실행

        localStorage.setItem("useBiometric", "true");
        setUseBiometric(true);
        alert("지문 잠금이 활성화되었습니다.");
      } catch (error) {
        console.error("Biometric setup failed", error);
        setUseBiometric(false);
      }
    } else {
      localStorage.setItem("useBiometric", "false"); // 설정 끄기
      setUseBiometric(false);
    }
  };

  // 파일 접근 권한 요청
  const requestPermission = async () => {
    const perm = await Filesystem.requestPermissions();
    return perm.publicStorage === "granted";
  };

  // 전체 앱 데이터 초기화 로직
  const resetAll = async () => {
    const c = window.confirm("정말 초기화 하시겠습니까?");
    if (!c) return;

    await clear("chapters");
    await clear("records");
    await clear("categories");

    const tx = db.transaction("categories", "readwrite");
    const store = tx.objectStore("categories");

    DEFAULT_CATEGORIES.forEach((name) => {
      store.add({ name });
    });

    await tx.done;

    alert("전체 초기화 완료되었습니다.");
  };

  // 데이터 백업 파일 생성
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
      directory: Directory.Documents,
      encoding: Encoding.UTF8,
    });

    alert("백업 파일이 저장되었습니다. 파일 관리 앱에서 확인할 수 있습니다.");
  };

  // 백업 파일을 이용한 데이터 복구
  const restoreData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const ok = window.confirm("현재 데이터가 모두 삭제되고 백업 파일로 덮어씌워집니다. 진행하시겠습니까?");
    if (!ok) {
      e.target.value = "";
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

      if (!data.chapters || !data.records || !data.categories) {
        alert("잘못된 백업 파일입니다.");
        return;
      }

      await clear("chapters");
      await clear("records");
      await clear("categories");

      const tx = db.transaction(["chapters", "records", "categories"], "readwrite");

      const chapterStore = tx.objectStore("chapters");
      const recordStore = tx.objectStore("records");
      const categoryStore = tx.objectStore("categories");

      data.chapters.forEach((c) => chapterStore.put(c));
      data.records.forEach((r) => recordStore.put(r));
      data.categories.forEach((cat) => categoryStore.put(cat));

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
        <SectionTitle>앱 설정</SectionTitle>

        {/* 생체 인증 토글 기능 */}
        <ToggleRow>
          <span style={{ fontSize: "15px" }}>지문 생체 잠금 사용</span>
          <ToggleSwitch>
            <input type="checkbox" checked={useBiometric} onChange={toggleBiometric} />
            <span></span>
          </ToggleSwitch>
        </ToggleRow>

        <Btn onClick={() => navigate("/settings/currency")}>금액 기호 설정하기</Btn>

        <Btn onClick={() => navigate("/settings/categories")}>카테고리 관리</Btn>

        <Btn onClick={() => setMode(mode === "light" ? "dark" : "light")}>테마 변경 현재 {mode === "light" ? "라이트모드" : "다크모드"}</Btn>

        <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid #ddd" }} />

        <SectionTitle>데이터 관리</SectionTitle>

        {/* 데이터 백업 작동 버튼 */}
        <Btn onClick={backupData} style={{ background: "#28a745" }}>
          데이터 백업 다운로드
        </Btn>

        {/* 데이터 복구 파일 선택 */}
        <Btn onClick={() => fileInputRef.current.click()} style={{ background: "#17a2b8" }}>
          데이터 복구 파일 불러오기
        </Btn>

        <input type="file" accept=".json" ref={fileInputRef} style={{ display: "none" }} onChange={restoreData} />

        {/* 전체 데이터 초기화 */}
        <Btn onClick={resetAll} style={{ background: "#d9534f", marginTop: "20px" }}>
          전체 데이터 초기화
        </Btn>
      </Content>
    </PageWrap>
  );
}
