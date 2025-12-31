import React, { useState, useEffect } from "react";
import { auth } from "../../db/firebase";
import { 
  GoogleAuthProvider, 
  signInWithCredential, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import styled from "styled-components";

const AuthContainer = styled.div`
  background: ${({ theme }) => theme.cardBg || "rgba(0,0,0,0.03)"};
  /* ▼ 여기에 테마 글자색 적용 */
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
      color: ${({ theme }) => theme.text}; /* 이름 색상 */
    }
    small { 
      font-size: 12px; 
      opacity: 0.7; 
      color: ${({ theme }) => theme.text}; /* 이메일 색상 */
    }
  }
`;

/* ▼ 설명 문구 스타일 컴포넌트 분리 */
const Description = styled.div`
  margin-bottom: 12px;
  font-size: 14px;
  opacity: 0.8;
  color: ${({ theme }) => theme.text}; /* 설명 글자색 */
  line-height: 1.4;
`;

const GoogleButton = styled.button`
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: white; /* 구글 버튼은 다크모드여도 흰색 유지 */
  color: #444;       /* 버튼 글씨는 어두운 색 유지 */
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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      const result = await FirebaseAuthentication.signInWithGoogle();
      
      if (Capacitor.isNativePlatform() && result.idToken) {
        const credential = GoogleAuthProvider.credential(result.idToken);
        await signInWithCredential(auth, credential);
      }
      
    } catch (error) {
      console.error("로그인 에러 상세:", error);
      
      if (error.code !== 'auth/user-cancelled' && error.message !== 'User cancelled') {
        alert(`로그인 실패: ${error.message || "알 수 없는 에러"}`);
      }
    }
  };

  const handleLogout = async () => {
    const isConfirmed = window.confirm("로그아웃 하시겠습니까?");
    
    if (isConfirmed) {
      try {
        await FirebaseAuthentication.signOut();
        await signOut(auth);
      } catch (error) {
        console.error("로그아웃 에러:", error);
        alert("로그아웃 처리 중 에러가 발생했습니다.");
      }
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
      {/* ▼ 스타일 컴포넌트로 교체 */}
      <Description>
        로그인하면 여러 기기에서 자동으로 데이터를 동기화할 수 있습니다.
      </Description>
      <GoogleButton onClick={handleLogin}>
        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" width="18" alt="G" />
        구글로 계속하기
      </GoogleButton>
    </AuthContainer>
  );
}