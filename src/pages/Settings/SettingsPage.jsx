import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Header from "../../components/UI/Header";
import GoogleAuth from "../../components/Auth/GoogleAuth";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { DEFAULT_CATEGORIES } from "../../constants/categories";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";

import SyncAction from "../../components/Data/SyncAction";
import BackupAction from "../../components/Data/BackupAction";
import NotificationSettings from "../../components/Info/NotificationSettings";

import * as S from "./SettingsPage.styles";

export default function SettingsPage({ setMode, mode }) {
  const navigate = useNavigate();
  const { db, clear } = useBudgetDB();
  const [useBiometric, setUseBiometric] = useState(false);

  useEffect(() => {
    setUseBiometric(localStorage.getItem("useBiometric") === "true");
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
      } catch {
        setUseBiometric(false);
      }
    } else {
      localStorage.setItem("useBiometric", "false");
      setUseBiometric(false);
    }
  };

  const resetAll = async () => {
    if (!window.confirm("정말 초기화 하시겠습니까?")) return;

    await clear("chapters");
    await clear("records");
    await clear("categories");

    const tx = db.transaction("categories", "readwrite");
    const now = Date.now();
    DEFAULT_CATEGORIES.forEach((name) => {
      tx.objectStore("categories").add({ 
        name, 
        updatedAt: now, 
        isDeleted: false 
      });
    });
    await tx.done;

    alert("전체 초기화 완료되었습니다.");
  };

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header title="설정" />
      </S.HeaderFix>

      <S.Content>
        <S.SectionTitle>앱 설정</S.SectionTitle>

        <S.ToggleRow>
          <span>지문 생체 잠금 사용</span>
          <S.ToggleSwitch>
            <input
              type="checkbox"
              checked={useBiometric}
              onChange={toggleBiometric}
            />
            <span></span>
          </S.ToggleSwitch>
        </S.ToggleRow>

        <S.Btn onClick={() => navigate("/settings/currency")}>금액 기호 설정하기</S.Btn>
        <S.Btn onClick={() => navigate("/settings/text-color")}>글자 색상 설정하기</S.Btn>
        <S.Btn onClick={() => navigate("/settings/categories")}>카테고리 관리</S.Btn>
        <S.Btn onClick={() => setMode(mode === "light" ? "dark" : "light")}>
          테마 변경 (현재 {mode === "light" ? "라이트" : "다크"})
        </S.Btn>

        <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid #ddd" }} />

        <NotificationSettings />

        <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid #ddd" }} />

        <S.SectionTitle>데이터 관리</S.SectionTitle>
        <GoogleAuth />
        <SyncAction />
        <BackupAction />

        <S.Btn onClick={() => navigate("/settings/privacy")} style={{ background: "#6c757d", marginTop: "10px" }}>
          개인정보 처리방침 확인
        </S.Btn>

        <S.Btn
          onClick={resetAll}
          style={{ background: "#d9534f", marginTop: "20px" }}
        >
          전체 데이터 초기화
        </S.Btn>
      </S.Content>
    </S.PageWrap>
  );
}