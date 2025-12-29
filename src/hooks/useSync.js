import LZString from "lz-string";
import { useBudgetDB } from "./useBudgetDB";

export function useSync() {
  const { getAll, clear, db } = useBudgetDB();

  // Cloud Functions 주소
  const UPLOAD_URL = process.env.REACT_APP_UPLOAD_URL;
  const DOWNLOAD_URL = process.env.REACT_APP_DOWNLOAD_URL;

  /**
   * [업로드] 데이터 백업 및 코드 발급
   */
  const generateSyncCode = async () => {
    try {
      // 데이터 수집
      const chapters = await getAll("chapters");
      const records = await getAll("records");
      const categories = await getAll("categories");

      const rawData = JSON.stringify({
        chapters,
        records,
        categories,
        exportedAt: new Date().toISOString(),
      });

      // 압축
      const compressed = LZString.compressToUTF16(rawData);

      // 서버 요청
      const response = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: compressed }),
      });

      // 에러 핸들링
      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = "서버 연결에 실패했습니다.";
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorMsg;
        } catch (e) {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(`${response.status}: ${errorMsg}`);
      }

      const result = await response.json();
      return result.data.pairingCode;

    } catch (err) {
      console.error("Upload Sync Error:", err);
      // 멘트 수정: 업로드 실패 시
      alert(`데이터 백업 중 문제가 발생했습니다: ${err.message}`);
      throw err;
    }
  };

  /**
   * [다운로드] 서버 데이터 복원
   */
  const syncFromServer = async (code) => {
    try {
      // 1. 서버 요청
      const response = await fetch(DOWNLOAD_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      // 에러 핸들링
      if (!response.ok) {
        const errorText = await response.text();
        let errorMsg = "데이터를 찾을 수 없습니다.";
        try {
          const errorJson = JSON.parse(errorText);
          errorMsg = errorJson.error || errorMsg;
        } catch (e) {
          errorMsg = errorText || errorMsg;
        }
        throw new Error(`${response.status}: ${errorMsg}`);
      }

      const result = await response.json();

      // 2. 압축 해제
      const decompressed = LZString.decompressFromUTF16(result.data);
      if (!decompressed) {
        throw new Error("데이터 파일이 손상되어 복구할 수 없습니다.");
      }

      const data = JSON.parse(decompressed);

      // 3. 기존 로컬 데이터 삭제
      await clear("chapters");
      await clear("records");
      await clear("categories");

      // 4. 새 데이터 저장 (트랜잭션)
      const tx = db.transaction(
        ["chapters", "records", "categories"],
        "readwrite"
      );

      if (data.chapters) data.chapters.forEach((v) => tx.objectStore("chapters").put(v));
      if (data.records) data.records.forEach((v) => tx.objectStore("records").put(v));
      if (data.categories) data.categories.forEach((v) => tx.objectStore("categories").put(v));

      await tx.done;

 
      alert("성공적으로 데이터를 불러왔습니다."); 
      return true;

    } catch (err) {
      console.error("Download Sync Error:", err);
      alert(`데이터를 불러오는 중 문제가 발생했습니다: ${err.message}`);
      return false;
    }
  };

  return { generateSyncCode, syncFromServer };
}