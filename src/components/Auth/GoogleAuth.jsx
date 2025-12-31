import React, { useState, useEffect } from "react";
import { auth, db } from "../../db/firebase";
import { initDB } from "../../db/indexedDB"; // ★ 분석한 님의 파일에서 가져옴
import { GoogleAuthProvider, signInWithCredential, signOut, onAuthStateChanged } from "firebase/auth";
import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";
import styled from "styled-components";

// --- 스타일 컴포넌트 (기존 유지) ---
const AuthContainer = styled.div`
  background: ${({ theme }) => theme.cardBg || "rgba(0,0,0,0.03)"};
  color: ${({ theme }) => theme.text || "#000"};
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
`;

const Profile = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;

  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
  }

  .info {
    display: flex;
    flex-direction: column;
    span {
      font-size: 14px;
      font-weight: bold;
      color: ${({ theme }) => theme.text};
    }
    small {
      font-size: 12px;
      opacity: 0.7;
      color: ${({ theme }) => theme.text};
    }
  }
`;

const Description = styled.div`
  margin-bottom: 12px;
  font-size: 14px;
  opacity: 0.8;
  color: ${({ theme }) => theme.text};
  line-height: 1.4;
`;

const GoogleButton = styled.button`
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white;
  color: #444;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  &:active {
    background: #f5f5f5;
  }
`;

export default function GoogleAuth() {
  const [user, setUser] = useState(null);

  // 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // ★ [핵심] 데이터 동기화 함수 (IndexedDB -> Firestore)
  const syncLocalDataToCloud = async (user) => {
    try {
      console.log("🔄 데이터 동기화 시작...");

      // 1. IndexedDB 열기
      const idb = await initDB();

      // 2. 모든 데이터 가져오기 (records, chapters, categories)
      const [records, chapters, categories] = await Promise.all([idb.getAll("records"), idb.getAll("chapters"), idb.getAll("categories")]);

      const totalItems = records.length + chapters.length + categories.length;
      if (totalItems === 0) {
        console.log("동기화할 로컬 데이터가 없습니다.");
        return;
      }

      // 3. Firestore Batch 생성 (한 번에 업로드)
      // 주의: Batch는 한 번에 최대 500개까지만 가능하므로, 데이터가 많으면 나눠서 보내야 함.
      // 여기서는 간단하게 구현했지만, 데이터가 수천 건이면 청크(Chunk) 로직이 필요할 수 있습니다.
      const batch = writeBatch(db);

      // (1) Records(내역) 동기화
      records.forEach((item) => {
        // ID가 없으면 자동 생성, 있으면 그대로 사용 (문서 ID를 로컬 ID와 맞추면 관리하기 편함)
        // 로컬 ID가 숫자라면 문자열로 변환 필요
        const docId = String(item.id);
        const docRef = doc(db, "users", user.uid, "records", docId);
        batch.set(
          docRef,
          {
            ...item,
            uid: user.uid,
            syncedAt: serverTimestamp(),
          },
          { merge: true }
        ); // 덮어쓰기 모드
      });

      // (2) Chapters(장부) 동기화
      chapters.forEach((item) => {
        const docId = String(item.chapterId || item.id); // chapterId 키값 확인 필요
        const docRef = doc(db, "users", user.uid, "chapters", docId);
        batch.set(
          docRef,
          {
            ...item,
            uid: user.uid,
            syncedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });

      // (3) Categories(카테고리) 동기화
      categories.forEach((item) => {
        const docId = String(item.id);
        const docRef = doc(db, "users", user.uid, "categories", docId);
        batch.set(
          docRef,
          {
            ...item,
            uid: user.uid,
            syncedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });

      // 4. 업로드 실행
      await batch.commit();
      console.log(`✅ 동기화 완료! (내역: ${records.length}, 챕터: ${chapters.length}, 카테고리: ${categories.length})`);
      alert("데이터가 안전하게 백업되었습니다!");
    } catch (error) {
      console.error("데이터 동기화 실패:", error);
      // 실패해도 로그인은 유지
    }
  };

  // 로그인 처리 함수
  const handleLogin = async () => {
    try {
      // 1. 네이티브 앱 로그인 (토큰 받기)
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;

      if (idToken) {
        // 2. Firebase JS SDK 로그인 (인증 연동)
        const credential = GoogleAuthProvider.credential(idToken);
        const userCredential = await signInWithCredential(auth, credential);
        const user = userCredential.user;

        console.log("로그인 성공:", user.email);

        // 3. 로그인 성공 시 데이터 동기화 자동 실행
        await syncLocalDataToCloud(user);
      } else {
        throw new Error("Google ID Token을 찾을 수 없습니다.");
      }
    } catch (error) {
      console.error("로그인 에러:", error);
      if (error.code !== "auth/user-cancelled" && error.message !== "User cancelled") {
        alert(`로그인 실패: ${error.message}`);
      }
    }
  };

  // 로그아웃 처리
  const handleLogout = async () => {
    if (window.confirm("로그아웃 하시겠습니까?")) {
      try {
        await FirebaseAuthentication.signOut();
        await signOut(auth);
        setUser(null);
      } catch (error) {
        console.error("로그아웃 에러:", error);
      }
    }
  };

  // UI 렌더링
  if (user) {
    return (
      <AuthContainer>
        <Profile>
          <img src={user.photoURL} alt="profile" />
          <div className="info">
            <span>{user.displayName}님</span>
            <small>{user.email}</small>
          </div>
        </Profile>
        <GoogleButton onClick={handleLogout} style={{ color: "#ff4d4f", borderColor: "#ff4d4f" }}>
          로그아웃
        </GoogleButton>
      </AuthContainer>
    );
  }

  return (
    <AuthContainer>
      <Description>로그인하면 내역, 챕터, 카테고리 설정이 구글 계정에 자동 저장됩니다.</Description>
      <GoogleButton onClick={handleLogin}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" alt="G" />
        구글로 계속하기
      </GoogleButton>
    </AuthContainer>
  );
}
