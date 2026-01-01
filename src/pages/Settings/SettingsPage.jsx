import { useNavigate } from "react-router-dom";
import Header from "../../components/UI/Header";
import GoogleAuth from "../../components/Auth/GoogleAuth";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { DEFAULT_CATEGORIES } from "../../constants/categories";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";

// 중앙 설정 컨텍스트 임포트
import { useSettings } from "../../context/SettingsContext";

import SyncAction from "../../components/Data/SyncAction";
import BackupAction from "../../components/Data/BackupAction";
import NotificationSettings from "../../components/Info/NotificationSettings";

import * as S from "./SettingsPage.styles";

// [필수] Firestore 삭제 기능을 위한 임포트
import { db as firestore, auth } from "../../db/firebase";
import { collection, getDocs, writeBatch } from "firebase/firestore";

export default function SettingsPage() {
  const navigate = useNavigate();
  const { db, clear } = useBudgetDB();

  // 중앙 설정 본부에서 값(settings)과 변경 함수(updateSetting)
  const { settings, updateSetting } = useSettings();

  const toggleBiometric = async (e) => {
    const isChecked = e.target.checked;

    if (isChecked) {
      try {
        const result = await NativeBiometric.isAvailable();
        if (!result.isAvailable) {
          alert("이 기기는 생체 인식을 지원하지 않습니다.");
          updateSetting("useBiometric", false);
          return;
        }

        await NativeBiometric.verifyIdentity({
          reason: "지문 인식 기능을 활성화합니다.",
          title: "본인 인증",
          subtitle: "지문 또는 얼굴을 인식해주세요",
          description: "설정을 변경하기 위해 인증이 필요합니다.",
        });

        updateSetting("useBiometric", true);
        alert("지문 잠금이 활성화되었습니다.");
      } catch {
        updateSetting("useBiometric", false);
      }
    } else {
      // 중앙 전역 설정 업데이트
      updateSetting("useBiometric", false);
    }
  };

  const resetAll = async () => {
    if (!window.confirm("정말 초기화 하시겠습니까? 로컬 및 서버의 모든 데이터가 영구 삭제됩니다.")) return;

    // DB가 로드되지 않았으면 중단
    if (!db) {
      alert("데이터베이스 로딩 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    try {
      // -----------------------------------------------------------
      // 1. [서버] Firestore 데이터 삭제 (로그인 상태라면)
      // -----------------------------------------------------------
      const user = auth.currentUser;
      if (user) {
        const batch = writeBatch(firestore);
        const STORES = ["chapters", "records", "categories"];
        let deletedCount = 0;

        for (const storeName of STORES) {
          const ref = collection(firestore, "users", user.uid, storeName);
          const snapshot = await getDocs(ref);
          snapshot.forEach((doc) => {
            batch.delete(doc.ref);
            deletedCount++;
          });
        }

        if (deletedCount > 0) {
          await batch.commit();
          console.log("🔥 서버 데이터 삭제 완료");
        }
      }

      // -----------------------------------------------------------
      // 2. [로컬] IndexedDB 데이터 삭제
      // -----------------------------------------------------------
      await clear("chapters");
      await clear("records");
      await clear("categories");

      // -----------------------------------------------------------
      // 3. [복구] 기본 카테고리 재생성 (ID 포함 필수!)
      // -----------------------------------------------------------
      const tx = db.transaction("categories", "readwrite");
      const now = Date.now();

      // Promise.all로 병렬 처리하여 확실하게 저장
      const promises = DEFAULT_CATEGORIES.map((name) => {
        return tx.objectStore("categories").add({
          id: crypto.randomUUID(), // 👈 [핵심] 이게 없으면 카테고리가 텅 빕니다!
          name,
          updatedAt: now,
          isDeleted: false,
        });
      });

      await Promise.all(promises);
      await tx.done;

      alert("모든 데이터가 초기화되었습니다.");
      // alert("모든 데이터가 초기화되고 기본 카테고리가 복구되었습니다.");

      // 데이터 꼬임 방지를 위해 새로고침
      window.location.reload();
    } catch (error) {
      console.error("초기화 실패:", error);
      alert("초기화 중 오류가 발생했습니다: " + error.message);
    }
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
            <input type="checkbox" checked={settings.useBiometric} onChange={toggleBiometric} />
            <span></span>
          </S.ToggleSwitch>
        </S.ToggleRow>

        <S.Btn onClick={() => navigate("/settings/currency")}>금액 기호 설정하기</S.Btn>
        <S.Btn onClick={() => navigate("/settings/text-color")}>글자 색상 설정하기</S.Btn>
        <S.Btn onClick={() => navigate("/settings/categories")}>카테고리 관리</S.Btn>

        <S.Btn onClick={() => updateSetting("mode", settings.mode === "light" ? "dark" : "light")}>테마 변경 (현재 {settings.mode === "light" ? "라이트" : "다크"})</S.Btn>

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

        <S.Btn onClick={resetAll} style={{ background: "#d9534f", marginTop: "20px" }}>
          전체 데이터 초기화
        </S.Btn>
      </S.Content>
    </S.PageWrap>
  );
}
