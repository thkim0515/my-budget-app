import React, { useState, useEffect } from "react";
import { auth } from "../../db/firebase";
import { 
  GoogleAuthProvider, 
  signInWithCredential, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { GoogleAuth } from 'capacitor-google-auth'; // 설치한 플러그인
import { Capacitor } from '@capacitor/core';
import styled from "styled-components";

const AuthContainer = styled.div`
  background: ${({ theme }) => theme.cardBg || "rgba(0,0,0,0.03)"};
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
    span { font-size: 14px; font-weight: bold; }
    small { font-size: 12px; opacity: 0.7; }
  }
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
  &:active { background: #f5f5f5; }
`;

export default function GoogleAuth() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // 1. 앱 시작 시 플러그인 초기화
    GoogleAuth.initialize();

    // 2. Firebase 인증 상태 관찰
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      // 3. 네이티브 구글 로그인 실행 (시스템 계정 선택창이 뜸)
      const googleUser = await GoogleAuth.signIn();
      
      // 4. 받은 idToken을 사용하여 Firebase 인증 자격 증명 생성
      const idToken = googleUser.authentication.idToken;
      const credential = GoogleAuthProvider.credential(idToken);
      
      // 5. Firebase에 이 자격 증명으로 로그인
      await signInWithCredential(auth, credential);
    } catch (error) {
      console.error("로그인 에러:", error);
      // 유저가 로그인을 취소한 경우가 아니면 알림 표시
      if (error.message !== "User cancelled") {
        alert("로그인에 실패했습니다.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await GoogleAuth.signOut(); // 네이티브 세션 로그아웃
      await signOut(auth);        // Firebase 세션 로그아웃
    } catch (error) {
      console.error("로그아웃 에러:", error);
    }
  };

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
      <div style={{ marginBottom: "12px", fontSize: "14px", opacity: 0.8 }}>
        로그인하면 여러 기기에서 자동으로 데이터를 동기화할 수 있습니다.
      </div>
      <GoogleButton onClick={handleLogin}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" alt="G" />
        구글로 계속하기
      </GoogleButton>
    </AuthContainer>
  );
}