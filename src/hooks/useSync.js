import { useState, useCallback } from "react";
import { db as firestore } from "../db/firebase";
import { collection, doc, writeBatch, getDocs } from "firebase/firestore";
import { useBudgetDB } from "./useBudgetDB";
import CryptoJS from "crypto-js";
import LZString from "lz-string";

// [추가됨] Firestore 데이터를 로컬 호환 형식으로 변환하는 헬퍼 함수
const normalizeFirestoreData = (data) => {
  if (!data) return data;
  const normalized = { ...data };

  Object.keys(normalized).forEach((key) => {
    const value = normalized[key];
    // 값이 Firestore Timestamp 객체인 경우 (toDate 메서드가 존재함) -> JS Date로 변환
    if (value && typeof value.toDate === "function") {
      normalized[key] = value.toDate();
    }
  });
  return normalized;
};

export function useSync() {
  const { db: localDb, getAllRaw, put } = useBudgetDB();
  const [isSyncing, setIsSyncing] = useState(false);

  // =================================================================
  // [Mode 1] 구글 로그인 유저용: Firestore 양방향 동기화 (핵심)
  // =================================================================
  const syncWithFirestore = useCallback(
    async (uid) => {
      // DB가 로드되지 않았거나 UID가 없으면 중단
      if (!localDb || !uid) return;

      setIsSyncing(true);

      try {
        const STORES = ["chapters", "records", "categories"];
        const currentSyncTime = Date.now();
        const batch = writeBatch(firestore);
        let hasChanges = false;

        // 1. 스토어별로 루프를 돌며 동기화 수행
        for (const storeName of STORES) {
          // --- A. 로컬 데이터 가져오기 ---
          const localItems = await getAllRaw(storeName);

          // --- B. Firestore 데이터 가져오기 (전체 스냅샷 비교) ---
          const ref = collection(firestore, "users", uid, storeName);
          const snapshot = await getDocs(ref);
          const remoteItemsMap = new Map();

          // Firestore 문서는 ID가 무조건 문자열입니다.
          // [수정됨] 데이터를 가져올 때 Timestamp -> Date 변환 수행
          snapshot.forEach((doc) => {
            remoteItemsMap.set(doc.id, normalizeFirestoreData(doc.data()));
          });

          // --- C. 로컬 -> 서버 (Push) ---
          for (const localItem of localItems) {
            // [중요] 스토어에 따라 사용하는 ID 필드가 다름
            const rawId = storeName === "chapters" ? localItem.chapterId : localItem.id;

            // ID가 없는 데이터는 건너뜀 (에러 방지)
            if (!rawId) {
              console.warn(`[Sync] ${storeName}에서 ID 없는 데이터 발견되어 건너뜀:`, localItem);
              continue;
            }

            // [핵심 수정] 숫자형 ID가 있어도 문자열로 강제 변환하여 Firestore 에러(n.indexOf...) 방지
            const docId = String(rawId);

            const remoteItem = remoteItemsMap.get(docId);

            // 로컬이 더 최신이거나, 서버에 없는 경우 -> 서버 업데이트
            if (!remoteItem || localItem.updatedAt > (remoteItem.updatedAt || 0)) {
              const docRef = doc(firestore, "users", uid, storeName, docId);
              batch.set(docRef, { ...localItem });
              hasChanges = true;
            }
          }

          // --- D. 서버 -> 로컬 (Pull) ---
          for (const [docId, remoteItem] of remoteItemsMap) {
            // 로컬에서 찾을 때도 ID를 문자열로 변환해서 비교해야 함
            const localItem = localItems.find((item) => {
              const itemId = storeName === "chapters" ? item.chapterId : item.id;
              return String(itemId) === docId;
            });

            // 서버가 더 최신이거나, 로컬에 없는 경우 -> 로컬 업데이트
            if (!localItem || remoteItem.updatedAt > (localItem.updatedAt || 0)) {
              // remoteItem은 위에서 이미 normalizeFirestoreData를 거쳐 Date 객체로 변환되어 있음
              await put(storeName, remoteItem);
            }
          }
        }

        // 변경사항이 있으면 Firestore에 일괄 적용
        if (hasChanges) {
          await batch.commit();
        }

        // 동기화 성공 시 시간 기록
        localStorage.setItem(`lastSyncTime_${uid}`, currentSyncTime);
        console.log("✅ 동기화 완료");
      } catch (error) {
        console.error("동기화 실패:", error);
      } finally {
        setIsSyncing(false);
      }
    },
    [localDb, getAllRaw, put]
  );

  // =================================================================
  // [Mode 2] 비로그인 유저용: 기존 수동 백업/복원 (Legacy Support)
  // =================================================================
  const UPLOAD_URL = process.env.REACT_APP_UPLOAD_URL;
  const DOWNLOAD_URL = process.env.REACT_APP_DOWNLOAD_URL;

  const backupManual = async (password) => {
    if (!password || password.length < 4) throw new Error("비밀번호는 4자리 이상이어야 합니다.");

    const data = {
      chapters: await getAllRaw("chapters"),
      records: await getAllRaw("records"),
      categories: await getAllRaw("categories"),
      exportedAt: new Date().toISOString(),
      version: 4, // 데이터 구조 버전 명시
    };

    const rawData = JSON.stringify(data);
    const compressed = LZString.compressToUTF16(rawData);
    const encrypted = CryptoJS.AES.encrypt(compressed, password).toString();

    const response = await fetch(UPLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { payload: encrypted, uid: "guest" } }),
    });

    if (!response.ok) throw new Error("백업 서버 전송 실패");
    const result = await response.json();
    return result.data.pairingCode;
  };

  const restoreManual = async (password, code) => {
    if (!localDb) throw new Error("DB 로드 중...");

    const response = await fetch(DOWNLOAD_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { code, uid: "guest" } }),
    });

    if (!response.ok) throw new Error("데이터 불러오기 실패");
    const result = await response.json();

    if (!result.data) throw new Error("데이터가 없습니다.");

    const bytes = CryptoJS.AES.decrypt(result.data, password);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) throw new Error("비밀번호가 틀렸거나 데이터가 손상되었습니다.");

    const serverData = JSON.parse(LZString.decompressFromUTF16(decrypted));

    const mergeStore = async (storeName, items) => {
      for (const item of items) {
        // 복원 시에도 ID 유효성 체크 및 키 확인
        const itemId = storeName === "chapters" ? item.chapterId : item.id;
        if (!itemId) continue;

        const existing = await localDb.get(storeName, itemId);
        if (!existing || item.updatedAt > existing.updatedAt) {
          await localDb.put(storeName, item);
        }
      }
    };

    await mergeStore("chapters", serverData.chapters || []);
    await mergeStore("records", serverData.records || []);
    await mergeStore("categories", serverData.categories || []);

    window.dispatchEvent(new CustomEvent("budget-db-updated"));
    return true;
  };

  return {
    isSyncing,
    syncWithFirestore, // 로그인 유저용
    backupManual, // 비로그인 유저용
    restoreManual, // 비로그인 유저용
  };
}
