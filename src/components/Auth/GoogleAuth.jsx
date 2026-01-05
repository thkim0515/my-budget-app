import React, { useState, useEffect } from "react";
import { auth } from "../../db/firebase";
import { 
  GoogleAuthProvider, 
  signInWithCredential, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import styled from "styled-components";

const AuthContainer = styled.div`
  background: ${({ theme }) => theme.cardBg || "rgba(0,0,0,0.03)"};
  color: ${({ theme }) => theme.text || "#000"}; 
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
`;

// 로그인 상태일 때 프로필과 버튼을 가로로 배치하기 위한 컨테이너
const LoggedInWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
`;

const Profile = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0; // 긴 텍스트 처리를 위한 설정

  img {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .info {
    display: flex;
    flex-direction: column;
    min-width: 0; // 긴 텍스트 처리를 위한 설정

    span { 
      font-size: 14px; 
      font-weight: bold;
      color: ${({ theme }) => theme.text};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    small { 
      font-size: 12px; 
      opacity: 0.7; 
      color: ${({ theme }) => theme.text};
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
  width: ${({ $isLogout }) => ($isLogout ? "auto" : "100%")};
  padding: ${({ $isLogout }) => ($isLogout ? "8px 12px" : "12px")};
  border: 1px solid ${({ $isLogout }) => ($isLogout ? "#ff4d4f" : "#ddd")};
  border-radius: 8px;
  background: white;
  color: ${({ $isLogout }) => ($isLogout ? "#ff4d4f" : "#444")};
  font-weight: bold;
  font-size: ${({ $isLogout }) => ($isLogout ? "13px" : "14px")};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  flex-shrink: 0;
  white-space: nowrap;
  
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

  // 로그인 함수
  const handleLogin = async () => {
    try {
      const result = await FirebaseAuthentication.signInWithGoogle();
      const idToken = result.credential?.idToken;

      if (idToken) {
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
        console.log("모바일 구글 로그인 성공 및 동기화 완료");
      } else {
        throw new Error("Google ID Token을 찾을 수 없습니다.");
      }
      
    } catch (error) {
      console.error("로그인 에러 상세:", error);
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
        await FirebaseAuthentication.signOut();
        await signOut(auth);
        setUser(null);
      } catch (error) {
        console.error("로그아웃 에러:", error);
        alert("로그아웃 처리 중 에러가 발생했습니다.");
      }
    }
  };

  if (user) {
    return (
      <AuthContainer>
        <LoggedInWrapper>
          <Profile>
            <img src={user.photoURL} alt="profile" />
            <div className="info">
              <span>{user.displayName}님</span>
              <small>{user.email}</small>
            </div>
          </Profile>
          <GoogleButton $isLogout onClick={handleLogout}>
            로그아웃
          </GoogleButton>
        </LoggedInWrapper>
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