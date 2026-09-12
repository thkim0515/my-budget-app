import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "styled-components";
import Header from "../../components/UI/Header";
import GoogleAuth from "../../components/Auth/GoogleAuth";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { DEFAULT_CATEGORIES } from "../../constants/categories";
import { NativeBiometric } from "@capgo/capacitor-native-biometric";

import { useSettings } from "../../context/SettingsContext";

import SyncAction from "../../components/Data/SyncAction";
import BackupAction from "../../components/Data/BackupAction";
import NotificationSettings from "../../components/Info/NotificationSettings";
import CardLimitSettings from "../../components/Info/CardLimitSettings";

import * as S from "./SettingsPage.styles";

// [필수] Firestore 삭제 기능을 위한 임포트
import { db as firestore, auth } from "../../db/firebase";
import { collection, getDocs, writeBatch } from "firebase/firestore";

const PIN_LENGTH = 4;

function PinSetupModal({ existingPin, onSave, onClose }) {
  const theme = useTheme();
  const [step, setStep] = useState(existingPin ? "verify" : "enter");
  const [digits, setDigits] = useState([]);
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");

  const label = {
    verify: "기존 PIN을 입력하세요",
    enter: "새 PIN 4자리를 입력하세요",
    confirm: "PIN을 한 번 더 입력하세요",
  }[step];

  const handleDigit = (d) => {
    if (digits.length >= PIN_LENGTH) return;
    const next = [...digits, d];
    setDigits(next);
    setError("");

    if (next.length < PIN_LENGTH) return;
    const entered = next.join("");

    setTimeout(() => {
      if (step === "verify") {
        if (entered !== existingPin) {
          setDigits([]);
          setError("기존 PIN이 틀렸습니다");
        } else {
          setStep("enter");
          setDigits([]);
        }
      } else if (step === "enter") {
        setFirstPin(entered);
        setStep("confirm");
        setDigits([]);
      } else {
        if (entered !== firstPin) {
          setDigits([]);
          setError("PIN이 일치하지 않습니다");
          setStep("enter");
          setFirstPin("");
        } else {
          onSave(entered);
        }
      }
    }, 200);
  };

  const handleDelete = () => { setDigits((p) => p.slice(0, -1)); setError(""); };

  const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 };
  const box = { background: theme.card, color: theme.text, borderRadius: 16, padding: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 20, minWidth: 280, border: `1px solid ${theme.border}` };
  const btnStyle = { width: 64, height: 64, borderRadius: "50%", border: `1px solid ${theme.border}`, background: theme.activeBg, color: theme.text, fontSize: 22, fontWeight: 600, cursor: "pointer" };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={box} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: 0 }}>PIN 설정</h3>
        <p style={{ margin: 0, fontSize: 15, opacity: 0.7 }}>{label}</p>

        <div style={{ display: "flex", gap: 16 }}>
          {Array.from({ length: PIN_LENGTH }).map((_, i) => (
            <div key={i} style={{ width: 16, height: 16, borderRadius: "50%", background: i < digits.length ? theme.primary : "transparent", border: `2px solid ${theme.primary}`, transition: "background 0.15s" }} />
          ))}
        </div>

        {error && <p style={{ margin: 0, color: theme.errorText, fontSize: 13, fontWeight: 600 }}>{error}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 64px)", gap: 12 }}>
          {[1,2,3,4,5,6,7,8,9].map((n) => (
            <button key={n} onClick={() => handleDigit(String(n))} style={btnStyle}>{n}</button>
          ))}
          <div />
          <button onClick={() => handleDigit("0")} style={btnStyle}>0</button>
          <button onClick={handleDelete} style={{ ...btnStyle, background: "transparent", color: "#888", fontSize: 20 }}>⌫</button>
        </div>

        <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 14, cursor: "pointer" }}>취소</button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { db, clear } = useBudgetDB();
  const [pinModalMode, setPinModalMode] = useState(null);

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

  const handleSavePin = (pin) => {
    updateSetting("lockPin", pin);
    setPinModalMode(null);
    alert("PIN이 설정되었습니다.");
  };

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header title="설정" />
      </S.HeaderFix>

      {pinModalMode && (
        <PinSetupModal
          existingPin={pinModalMode === "change" ? settings.lockPin : ""}
          onSave={handleSavePin}
          onClose={() => setPinModalMode(null)}
        />
      )}

      <S.Content>
        <S.SectionTitle>앱 설정</S.SectionTitle>

        <S.ToggleRow>
          <span>지문 생체 잠금 사용</span>
          <S.ToggleSwitch>
            <input type="checkbox" checked={settings.useBiometric} onChange={toggleBiometric} />
            <span></span>
          </S.ToggleSwitch>
        </S.ToggleRow>

        {settings.lockPin ? (
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <S.Btn style={{ marginBottom: 0, textAlign: "center" }} onClick={() => setPinModalMode("change")}>PIN 변경</S.Btn>
            <S.Btn style={{ marginBottom: 0, textAlign: "center", background: "#F5455C", color: "#fff", border: "none" }} onClick={() => { if (window.confirm("PIN을 삭제하시겠습니까?")) updateSetting("lockPin", ""); }}>PIN 삭제</S.Btn>
          </div>
        ) : (
          <S.Btn onClick={() => setPinModalMode("set")}>PIN 잠금 설정 (지문 실패 시 폴백)</S.Btn>
        )}

        <S.Btn onClick={() => navigate("/settings/currency")}>금액 기호 설정하기</S.Btn>
        <S.Btn onClick={() => navigate("/settings/text-color")}>글자 색상 설정하기</S.Btn>
        <S.Btn onClick={() => navigate("/settings/categories")}>카테고리 관리</S.Btn>

        <S.Btn onClick={() => updateSetting("mode", settings.mode === "light" ? "dark" : "light")}>테마 변경 (현재 {settings.mode === "light" ? "라이트" : "다크"})</S.Btn>

        <hr style={{ margin: "20px 0", border: 0, borderTop: `1px solid ${theme.border}` }} />

        <NotificationSettings />

        <hr style={{ margin: "20px 0", border: 0, borderTop: `1px solid ${theme.border}` }} />

        <CardLimitSettings />

        <hr style={{ margin: "20px 0", border: 0, borderTop: `1px solid ${theme.border}` }} />

        <S.SectionTitle>데이터 관리</S.SectionTitle>
        <GoogleAuth />
        <SyncAction />
        <BackupAction />

        <S.Btn onClick={() => navigate("/settings/privacy")} style={{ marginTop: "10px" }}>
          개인정보 처리방침 확인
        </S.Btn>

        <S.Btn onClick={resetAll} style={{ background: "#F5455C", color: "#fff", border: "none", textAlign: "center", marginTop: "20px" }}>
          전체 데이터 초기화
        </S.Btn>
      </S.Content>
    </S.PageWrap>
  );
}
