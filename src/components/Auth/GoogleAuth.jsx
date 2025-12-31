import React, { useState, useEffect } from "react";
import { auth } from "../../db/firebase"; // 경로는 본인 프로젝트에 맞게 유지
import { 
  GoogleAuthProvider, 
  signInWithCredential, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import styled from "styled-components";

// 스타일 컴포넌트들 (기존 유지)
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
  &:active { background: #f5f5f5; }
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

  // 로그인 함수 (핵심 수정됨)
  const handleLogin = async () => {
    try {
      // 1. 네이티브(앱) 구글 로그인 시도
      const result = await FirebaseAuthentication.signInWithGoogle();
      
      // 2. 결과에서 idToken 추출 
      // result.idToken (X) -> result.credential.idToken (O)
      const idToken = result.credential?.idToken;

      if (idToken) {
        // 3. 토큰으로 인증서(Credential) 생성
        const credential = GoogleAuthProvider.credential(idToken);
        
        // 4. 리액트(Firebase JS SDK)에 로그인 정보 동기화
        await signInWithCredential(auth, credential);
        
        console.log("모바일 구글 로그인 성공 및 동기화 완료");
      } else {
        throw new Error("Google ID Token을 찾을 수 없습니다.");
      }
      
    } catch (error) {
      console.error("로그인 에러 상세:", error);
      
      // 사용자가 취소한 경우는 에러 메시지 띄우지 않음
      if (error.code !== 'auth/user-cancelled' && error.message !== 'User cancelled') {
        alert(`로그인 실패: ${error.message || "알 수 없는 에러"}`);
      }
    }
  };

  // 로그아웃 함수
  const handleLogout = async () => {
    const isConfirmed = window.confirm("로그아웃 하시겠습니까?");
    
    if (isConfirmed) {
      try {
        await FirebaseAuthentication.signOut(); // 네이티브 로그아웃
        await signOut(auth); // 웹 로그아웃
        setUser(null); // 상태 초기화
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