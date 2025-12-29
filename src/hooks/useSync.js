import CryptoJS from "crypto-js";
import LZString from "lz-string";
import { auth } from "../db/firebase";
import { useBudgetDB } from "./useBudgetDB";

export function useSync() {
  const { getAllRaw, db: localDb } = useBudgetDB();

  const UPLOAD_URL = process.env.REACT_APP_UPLOAD_URL;
  const DOWNLOAD_URL = process.env.REACT_APP_DOWNLOAD_URL;

  /**
   * [내부 로직] 데이터 압축 및 암호화
   */
  const encryptData = async (password) => {
    const data = {
      chapters: await getAllRaw("chapters"),
      records: await getAllRaw("records"),
      categories: await getAllRaw("categories"),
      exportedAt: new Date().toISOString(),
    };

    const rawData = JSON.stringify(data);
    const compressed = LZString.compressToUTF16(rawData);

    // AES 암호화 (비밀번호는 클라이언트에서만 사용)
    return CryptoJS.AES.encrypt(compressed, password).toString();
  };

  /**
   * [업로드] 데이터 백업
   */
  const uploadData = async (password) => {
    try {
      if (!password || password.length < 4) {
        throw new Error("비밀번호는 4자리 이상 입력해주세요.");
      }

      const encryptedPayload = await encryptData(password);
      const user = auth.currentUser;

      const response = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Firebase v2 파싱 대응을 위해 data 래핑 권장
        body: JSON.stringify({
          data: {
            payload: encryptedPayload,
            uid: user ? user.uid : null,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "서버 전송 실패");
      }

      const result = await response.json();
      return result.data.pairingCode;
    } catch (err) {
      console.error("Upload Error:", err);
      throw err;
    }
  };

  /**
   * [다운로드 및 병합]
   */
  const downloadAndMerge = async (password, code = null) => {
    if (!localDb) {
      throw new Error("데이터베이스 연결 실패");
    }

    try {
      const user = auth.currentUser;
      const response = await fetch(DOWNLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            code: code,
            uid: user ? user.uid : null,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "데이터 로드 실패");
      }

      const result = await response.json();
      const encryptedData = result.data;

      if (!encryptedData) {
        throw new Error("서버에 저장된 데이터가 없습니다.");
      }

      // 1. 복호화
      const bytes = CryptoJS.AES.decrypt(encryptedData, password);
      const decrypted = bytes.toString(CryptoJS.enc.Utf8);

      if (!decrypted) {
        throw new Error("비밀번호가 일치하지 않습니다.");
      }

      // 2. 압축 해제 및 파싱
      const decompressed = LZString.decompressFromUTF16(decrypted);
      const serverData = JSON.parse(decompressed);

      // 3. 병합 엔진 (최신순 비교)
      const merge = (localArr, serverArr, keyName) => {
        const map = new Map();
        localArr.forEach((item) => map.set(item[keyName], item));

        serverArr.forEach((serverItem) => {
          const localItem = map.get(serverItem[keyName]);
          if (!localItem || serverItem.updatedAt > (localItem.updatedAt || 0)) {
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

      // 4. 로컬 DB 저장
      const tx = localDb.transaction(["chapters", "records", "categories"], "readwrite");
      mergedChapters.forEach((v) => tx.objectStore("chapters").put(v));
      mergedRecords.forEach((v) => tx.objectStore("records").put(v));
      mergedCategories.forEach((v) => tx.objectStore("categories").put(v));
      await tx.done;

      window.dispatchEvent(new CustomEvent("budget-db-updated"));
      return true;
    } catch (err) {
      console.error("Sync Error:", err);
      throw err;
    }
  };

  return { uploadData, downloadAndMerge };
}