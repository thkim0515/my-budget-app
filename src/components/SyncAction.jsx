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
`;


export default function SyncAction() {
  const { generateSyncCode, syncFromServer } = useSync();

    const handleUpload = async () => {
    const code = await generateSyncCode();

    // 클립보드 복사
    if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
    } else {
        // 구형/웹뷰 fallback
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

    alert(`동기화 코드가 클립보드에 복사되었습니다.\n\n${code}\n\n3분 이내 1회 사용`);
    };


  const handleDownload = async () => {
    const code = prompt("7자리 동기화 코드를 입력하세요");
    if (!code) return;

    await syncFromServer(code);
    alert("동기화 완료. 앱을 새로고침합니다.");
    window.location.reload();
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
