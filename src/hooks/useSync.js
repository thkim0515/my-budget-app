import LZString from "lz-string";
import { useBudgetDB } from "./useBudgetDB";

export function useSync() {
  // Task 1에서 추가한 getAllRaw를 사용하여 삭제된 데이터까지 포함해 병합합니다.
  const { getAllRaw, db } = useBudgetDB();

  const UPLOAD_URL = process.env.REACT_APP_UPLOAD_URL;
  const DOWNLOAD_URL = process.env.REACT_APP_DOWNLOAD_URL;

  /**
   * [업로드] 데이터 백업 (동일)
   */
  const generateSyncCode = async () => {
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
        body: JSON.stringify({ payload: compressed }),
      });

      if (!response.ok) throw new Error("서버 업로드 실패");
      const result = await response.json();
      return result.data.pairingCode;
    } catch (err) {
      alert(`백업 중 오류: ${err.message}`);
      throw err;
    }
  };

  /**
   * [다운로드 및 병합] 최신순 병합 엔진
   */
  const syncFromServer = async (code) => {
    try {
      const response = await fetch(DOWNLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) throw new Error("데이터를 찾을 수 없습니다.");
      const result = await response.json();
      const decompressed = LZString.decompressFromUTF16(result.data);
      const serverData = JSON.parse(decompressed);

      // 병합 처리 함수: 로컬과 서버 데이터를 비교하여 최신본 추출
      const merge = (localArr, serverArr, keyName) => {
        const map = new Map();
        
        // 1. 로컬 데이터 먼저 맵에 담기
        localArr.forEach(item => map.set(item[keyName], item));
        
        // 2. 서버 데이터와 비교하며 최신본으로 교체
        serverArr.forEach(serverItem => {
          const localItem = map.get(serverItem[keyName]);
          if (!localItem || (serverItem.updatedAt > (localItem.updatedAt || 0))) {
            map.set(serverItem[keyName], serverItem);
          }
        });
        
        return Array.from(map.values());
      };

      // 각 스토어별 로컬 데이터 가져오기 (삭제된 것 포함)
      const localChapters = await getAllRaw("chapters");
      const localRecords = await getAllRaw("records");
      const localCategories = await getAllRaw("categories");

      // 병합 실행
      const mergedChapters = merge(localChapters, serverData.chapters || [], "chapterId");
      const mergedRecords = merge(localRecords, serverData.records || [], "id");
      const mergedCategories = merge(localCategories, serverData.categories || [], "id");

      // 트랜잭션을 통해 병합된 데이터 저장
      const tx = db.transaction(["chapters", "records", "categories"], "readwrite");
      
      // 기존 데이터를 지우지 않고 put(수정/추가) 방식으로 저장
      mergedChapters.forEach(v => tx.objectStore("chapters").put(v));
      mergedRecords.forEach(v => tx.objectStore("records").put(v));
      mergedCategories.forEach(v => tx.objectStore("categories").put(v));

      await tx.done;
      alert("기기 간 데이터 병합이 완료되었습니다.");
      return true;

    } catch (err) {
      console.error("Sync Error:", err);
      alert(`동기화 중 오류: ${err.message}`);
      return false;
    }
  };

  return { generateSyncCode, syncFromServer };
}