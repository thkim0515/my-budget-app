import { useState, useEffect } from "react";
import { useSync } from "../hooks/useSync";
import { auth } from "../db/firebase";
import { onAuthStateChanged } from "firebase/auth";
import styled, { keyframes } from "styled-components"; // keyframes 추가
import { useNavigate } from "react-router-dom";

const Container = styled.div`
  width: 100%;
`;

// 스피너 애니메이션 정의
const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

// 로딩 스피너 스타일
const Spinner = styled.div`
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top: 2px solid white;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`;

export const Row50 = styled.div`
  display: flex;
  gap: 10px;
  width: 100%;
  & > button {
    flex: 1;
  }
`;

export const Btn = styled.button`
  width: 100%;
  padding: 12px;
  margin-bottom: 12px;
  border: none;
  border-radius: 6px;
  background: ${props => props.disabled ? "#adb5bd" : (props.bg || "#1976d2")};
  color: white;
  font-size: 15px;
  cursor: ${props => props.disabled ? "not-allowed" : "pointer"};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  &:active { opacity: ${props => props.disabled ? 1 : 0.8}; }
`;

export default function SyncAction() {
  const { uploadData, downloadAndMerge } = useSync();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false); // 로딩 상태 추가

  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleUpload = async () => {
    const password = prompt("동기화(암호화)에 사용할 비밀번호 4자리를 설정하세요.\n서버는 이 비밀번호를 저장하지 않으며, 분실 시 복구가 불가능합니다.");
    
    if (!password) return;
    if (password.length < 4) {
      alert("비밀번호는 최소 4자리 이상 입력해주세요.");
      return;
    }

    setIsLoading(true); // 로딩 시작
    try {
      const code = await uploadData(password);

      // 클립보드 복사 로직
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }

      const msg = user 
        ? `본인 계정에 백업되었습니다.\n다른 기기에서 로그인 후 동일한 비밀번호로 가져올 수 있습니다.\n\n임시 이동 코드: ${code}`
        : `서버로 전송되었습니다.\n\n코드: ${code}\n비밀번호: ${password}\n\n코드가 복사되었습니다. 3분 이내에 사용해주세요.`;
      
      alert(msg);
    } catch (err) {
      alert("업로드 실패: " + err.message);
    } finally {
      setIsLoading(false); // 로딩 종료
    }
  };

  const handleDownload = async () => {
    const password = prompt("데이터 복호화를 위해 설정했던 비밀번호 4자리를 입력하세요.");
    if (!password) return;

    let code = null;
    if (!user) {
      code = prompt("6자리 동기화 코드를 입력하세요.");
      if (!code) return;
    }

    setIsLoading(true); // 로딩 시작
    try {
      const success = await downloadAndMerge(password, code);
      if (success) {
        alert("동기화 성공! 데이터를 불러왔습니다.");
        // window.location.reload();
        navigate("/", { replace: true });
      }
    } catch (err) {
      alert("동기화 실패: " + err.message);
    } finally {
      setIsLoading(false); // 로딩 종료
    }
  };

  return (
    <Container>
      <Row50>
        <Btn onClick={handleUpload} bg="#4C6EF5" disabled={isLoading}>
          {isLoading ? <Spinner /> : null}
          {isLoading ? "전송 중..." : "서버로 보내기"}
        </Btn>
        <Btn onClick={handleDownload} bg="#6C757D" disabled={isLoading}>
          {isLoading ? <Spinner /> : null}
          {isLoading ? "가져오는 중..." : "서버에서 가져오기"}
        </Btn>
      </Row50>
    </Container>
  );
}