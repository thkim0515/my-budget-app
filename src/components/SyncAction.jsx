import { useState, useEffect } from "react";
import { useSync } from "../hooks/useSync";
import { auth } from "../db/firebase";
import { onAuthStateChanged } from "firebase/auth";
import styled from "styled-components";

const Container = styled.div`
  width: 100%;
  /* margin-bottom 제거: GoogleAuth와의 간격은 SettingsPage에서 조절 */
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
  background: #1976d2;
  color: white;
  font-size: 15px;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

export default function SyncAction() {
  const { uploadData, downloadAndMerge } = useSync();
  const [user, setUser] = useState(null);

  // 로직은 필요하므로 인증 상태 감시만 유지 (UI 출력은 안 함)
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

    try {
      const code = await uploadData(password);

      // 클립보드 복사
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
    }
  };

  const handleDownload = async () => {
    // 1. 복호화 비밀번호는 누구에게나 필수입니다.
    const password = prompt("데이터 복호화를 위해 설정했던 비밀번호 4자리를 입력하세요.");
    if (!password) return;

    let code = null;

    // 2. 로그인 여부에 따른 코드 요청 분기
    if (!user) {
      // 로그인을 안 했다면 6자리 코드가 반드시 필요합니다.
      code = prompt("6자리 동기화 코드를 입력하세요.");
      if (!code) return;
    } 
    // [수정 포인트] 로그인 상태라면 별도의 질문 없이 code는 null인 상태로 진행합니다.
    // 서버는 uid가 있으면 계정 데이터를 우선적으로 가져오도록 이미 설계되어 있습니다.

    try {
      const success = await downloadAndMerge(password, code);
      if (success) {
        alert("동기화 성공! 데이터를 불러왔습니다.");
        window.location.reload();
      }
    } catch (err) {
      alert("동기화 실패: " + err.message);
    }
  };

  return (
    <Container>
      <Row50>
        <Btn onClick={handleUpload} style={{ background: "#4C6EF5" }}>
          서버로 보내기
        </Btn>
        <Btn onClick={handleDownload} style={{ background: "#6C757D" }}>
          서버에서 가져오기
        </Btn>
      </Row50>
    </Container>
  );
}