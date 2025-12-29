import React, { useState, useEffect } from "react";
import { auth, googleProvider } from "../db/firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
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
    // Firebase 인증 상태 관찰
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = () => signInWithPopup(auth, googleProvider).catch(() => alert("로그인 실패"));
  const handleLogout = () => signOut(auth);

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