import LZString from "lz-string";
import { useBudgetDB } from "./useBudgetDB";

export function useSync() {
  const { getAllRaw, db } = useBudgetDB();

  const UPLOAD_URL = process.env.REACT_APP_UPLOAD_URL;
  const DOWNLOAD_URL = process.env.REACT_APP_DOWNLOAD_URL;

  /**
   * [업로드] 데이터 백업
   * @param {string} password - 사용자가 설정한 4자리 이상의 암호
   */
  const generateSyncCode = async (password) => {
    try {
      const chapters = await getAllRaw("chapters");
      const records = await getAllRaw("records");
      const categories = await getAllRaw("categories");

      const rawData = JSON.stringify({
        chapters,
        records,
        categories,
        exportedAt: new Date().toISOString(),
      });

      const compressed = LZString.compressToUTF16(rawData);

      const response = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 서버에서 요구하는 payload와 password를 함께 전송
        body: JSON.stringify({ 
          payload: compressed, 
          password: password 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "서버 업로드 실패");
      }

      const result = await response.json();
      return result.data.pairingCode; // 6자리 숫자 코드 반환
    } catch (err) {
      alert(`백업 중 오류: ${err.message}`);
      throw err;
    }
  };

  /**
   * [다운로드 및 병합] 최신순 병합 엔진
   * @param {string} code - 6자리 숫자 동기화 코드
   * @param {string} password - 업로드 시 설정했던 암호
   */
  const syncFromServer = async (code, password) => {
    if (!db) {
      alert("다운로드 및 병합 진행중입니다. 잠시후 다시 시도해주세요.");
      return false;
    }
    try {
      const response = await fetch(DOWNLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // 코드와 암호를 함께 전송하여 검증
        body: JSON.stringify({ 
          code: code, 
          password: password 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        // 401: 암호 틀림, 404: 코드 없음, 410: 만료 등
        throw new Error(errorData.error || "데이터를 가져올 수 없습니다.");
      }

      const result = await response.json();
      // result.data는 Cloud Function에서 doc.payload를 반환하므로 압축된 문자열임
      const decompressed = LZString.decompressFromUTF16(result.data);
      if (!decompressed) throw new Error("데이터 복원 실패");
      
      const serverData = JSON.parse(decompressed);

      // 병합 처리 함수: 로컬과 서버 데이터를 비교하여 최신본 추출
      const merge = (localArr, serverArr, keyName) => {
        const map = new Map();
        localArr.forEach(item => map.set(item[keyName], item));
        
        serverArr.forEach(serverItem => {
          const localItem = map.get(serverItem[keyName]);
          // 로컬에 없거나, 서버 데이터가 더 최신인 경우 교체
          if (!localItem || (serverItem.updatedAt > (localItem.updatedAt || 0))) {
            map.set(serverItem[keyName], serverItem);
          }
        });
        
        return Array.from(map.values());
      };

      const localChapters = await getAllRaw("chapters");
      const localRecords = await getAllRaw("records");
      const localCategories = await getAllRaw("categories");

      const mergedChapters = merge(localChapters, serverData.chapters || [], "chapterId");
      const mergedRecords = merge(localRecords, serverData.records || [], "id");
      const mergedCategories = merge(localCategories, serverData.categories || [], "id");

      const tx = db.transaction(["chapters", "records", "categories"], "readwrite");
      
      mergedChapters.forEach(v => tx.objectStore("chapters").put(v));
      mergedRecords.forEach(v => tx.objectStore("records").put(v));
      mergedCategories.forEach(v => tx.objectStore("categories").put(v));

      await tx.done;

      window.dispatchEvent(new CustomEvent("budget-db-updated"));
      
      return true;

    } catch (err) {
      console.error("Sync Error:", err);

      throw err; 
    }
  };

  return { generateSyncCode, syncFromServer };
}