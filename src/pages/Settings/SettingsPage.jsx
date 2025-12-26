import { useNavigate } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import Header from "../../components/Header";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { DEFAULT_CATEGORIES } from "../../constants/categories";
import { Filesystem, Directory, Encoding } from "@capacitor/filesystem";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";
import { Capacitor } from "@capacitor/core";
import { BudgetPlugin } from "../../plugins/BudgetPlugin";


import * as S from './SettingsPage.styles';

export default function SettingsPage({ setMode, mode }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { db, getAll, clear } = useBudgetDB();
  const [useBiometric, setUseBiometric] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("useBiometric") === "true";
    setUseBiometric(saved);
  }, []);

  const toggleBiometric = async (e) => {
    const isChecked = e.target.checked;
    if (isChecked) {
      try {
        const result = await NativeBiometric.isAvailable();
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
        });
        localStorage.setItem("useBiometric", "true");
        setUseBiometric(true);
        alert("지문 잠금이 활성화되었습니다.");
      } catch (error) {
        console.error("Biometric setup failed", error);
        setUseBiometric(false);
      }
    } else {
      localStorage.setItem("useBiometric", "false");
      setUseBiometric(false);
    }
  };

  const requestPermission = async () => {
    const perm = await Filesystem.requestPermissions();
    return perm.publicStorage === "granted";
  };

  const resetAll = async () => {
    if (!window.confirm("정말 초기화 하시겠습니까?")) return;
    await clear("chapters");
    await clear("records");
    await clear("categories");
    const tx = db.transaction("categories", "readwrite");
    DEFAULT_CATEGORIES.forEach((name) => { tx.objectStore("categories").add({ name }); });
    await tx.done;
    alert("전체 초기화 완료되었습니다.");
  };


  const backupData = async () => {
    const chapters = await getAll("chapters");
    const records = await getAll("records");
    const categories = await getAll("categories");

    const data = {
      chapters,
      records,
      categories,
      exportedAt: new Date().toISOString(),
    };

    const fileName = `budget_backup_${new Date().toISOString().slice(0, 10)}.json`;

    // 웹 환경
    if (!Capacitor.isNativePlatform()) {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      alert("백업 파일이 다운로드되었습니다.");
      return;
    }

    // 모바일 환경
    const granted = await requestPermission();
    if (!granted) {
      alert("파일 저장 권한이 필요합니다.");
      return;
    }

    try {
      await Filesystem.writeFile({
        path: fileName,
        data: JSON.stringify(data, null, 2),
        directory: Directory.Documents,
        encoding: Encoding.UTF8,
      });
      alert("백업 파일이 저장되었습니다.");
    } catch (err) {
      alert("백업 실패: " + err.message);
    }
  };


  const restoreData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!window.confirm("기존 데이터가 삭제되고 백업 파일로 대체됩니다.")) { 
      e.target.value = ""; 
      return; 
    }
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let data = JSON.parse(event.target.result);
        if (!data.chapters || !data.records || !data.categories) {
          throw new Error("올바르지 않은 백업 파일 형식입니다.");
        }
        await clear("chapters"); await clear("records"); await clear("categories");
        const tx = db.transaction(["chapters", "records", "categories"], "readwrite");
        data.chapters.forEach((c) => tx.objectStore("chapters").put(c));
        data.records.forEach((r) => tx.objectStore("records").put(r));
        data.categories.forEach((cat) => tx.objectStore("categories").put(cat));
        await tx.done;
        alert("복구 완료되었습니다.");
      } catch (err) {
        alert("복구 실패: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const openNotificationAccess = async () => {
    if (Capacitor.getPlatform() !== "android") return;
    await BudgetPlugin.openNotificationAccessSettings();
  };

  return (
    <S.PageWrap>
      <S.HeaderFix><Header title="설정" /></S.HeaderFix>
      <S.Content>
        <S.SectionTitle>앱 설정</S.SectionTitle>
        <S.ToggleRow>
          <span style={{ fontSize: "15px" }}>지문 생체 잠금 사용</span>
          <S.ToggleSwitch>
            <input type="checkbox" checked={useBiometric} onChange={toggleBiometric} />
            <span></span>
          </S.ToggleSwitch>
        </S.ToggleRow>

        <S.Btn onClick={openNotificationAccess}>알림 접근 권한 설정</S.Btn>
        <S.Btn onClick={() => navigate("/settings/currency")}>금액 기호 설정하기</S.Btn>
        
        {/* 🔥 새로 추가된 글자 색상 설정 이동 버튼 */}
        <S.Btn onClick={() => navigate("/settings/text-color")}>글자 색상 설정하기</S.Btn>

        <S.Btn onClick={() => navigate("/settings/categories")}>카테고리 관리</S.Btn>
        <S.Btn onClick={() => setMode(mode === "light" ? "dark" : "light")}>
          테마 변경 (현재 {mode === "light" ? "라이트모드" : "다크모드"})
        </S.Btn>

        <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid #ddd" }} />
        <S.SectionTitle>데이터 관리</S.SectionTitle>
        <S.Btn onClick={backupData} style={{ background: "#28a745" }}>데이터 백업 다운로드</S.Btn>
        <S.Btn onClick={() => fileInputRef.current.click()} style={{ background: "#17a2b8" }}>데이터 복구 파일 불러오기</S.Btn>
        <input type="file" accept=".json" ref={fileInputRef} style={{ display: "none" }} onChange={restoreData} />
        <S.Btn onClick={resetAll} style={{ background: "#d9534f", marginTop: "20px" }}>전체 데이터 초기화</S.Btn>
      </S.Content>
    </S.PageWrap>
  );
}