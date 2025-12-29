import { useSync } from "../hooks/useSync";
import styled from "styled-components";

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
  const { generateSyncCode, syncFromServer } = useSync();

  const handleUpload = async () => {
    const password = prompt("동기화 시 사용할 임시 비밀번호 4자리를 설정하세요.");
    
    if (!password) return;
    if (password.length < 4) {
      alert("비밀번호는 최소 4자리 이상 입력해주세요.");
      return;
    }

    // 2. 서버로 페이로드와 비밀번호 전송
    const code = await generateSyncCode(password);

    if (!code) return;

    // 3. 클립보드 복사 로직
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(code);
    } else {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    alert(`동기화 코드가 생성되었습니다.\n\n코드: ${code}\n비밀번호: ${password}\n\n코드가 클립보드에 복사되었습니다. 3분 이내에 사용해주세요.`);
  };

  const handleDownload = async () => {
    const code = prompt("6자리 동기화 코드를 입력하세요");
    if (!code) return;

    const password = prompt("설정했던 비밀번호 4자리를 입력하세요");
    if (!password) return;

    try {
      await syncFromServer(code, password);
      alert("동기화 성공! 데이터를 불러왔습니다.");
      window.location.reload();
    } catch (err) {
      alert(err.message || "동기화에 실패했습니다. 코드와 비밀번호를 확인하세요.");
    }
  };

  return (
    <Row50>
      <Btn onClick={handleUpload} style={{ background: "#4C6EF5" }}>
        서버로 보내기
      </Btn>
      <Btn onClick={handleDownload} style={{ background: "#6C757D" }}>
        서버에서 가져오기
      </Btn>
    </Row50>
  );
}