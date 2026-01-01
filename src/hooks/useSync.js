import { useState, useCallback, useRef } from "react";
import { db as firestore } from "../db/firebase";
import { collection, doc, writeBatch, getDocs } from "firebase/firestore";
import { useBudgetDB } from "./useBudgetDB";
import CryptoJS from "crypto-js";
import LZString from "lz-string";

// [핵심 수정 1] 날짜 형식이 달라도(Timestamp vs Date vs Number) 정확히 비교하는 헬퍼 함수
const getTime = (dateOrTimestamp) => {
  if (!dateOrTimestamp) return 0;
  if (typeof dateOrTimestamp.toMillis === 'function') return dateOrTimestamp.toMillis(); // Firestore Timestamp
  if (dateOrTimestamp instanceof Date) return dateOrTimestamp.getTime(); // JS Date
  if (typeof dateOrTimestamp === 'number') return dateOrTimestamp; // Timestamp number
  return 0;
};

const normalizeFirestoreData = (data) => {
  if (!data) return data;
  const normalized = { ...data };

  Object.keys(normalized).forEach((key) => {
    const value = normalized[key];
    if (value && typeof value.toDate === "function") {
      normalized[key] = value.toDate();
    }
  });
  return normalized;
};

export function useSync() {
  const { db: localDb, getAllRaw, put } = useBudgetDB();
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  // =================================================================
  // [Mode 1] 구글 로그인 유저용: Firestore 양방향 동기화
  // =================================================================
  const syncWithFirestore = useCallback(
    async (uid) => {
      // 🚨 안전장치: 이미 동기화 중이면 중복 실행 차단
      if (!localDb || !uid || isSyncingRef.current) return;

      try {
        isSyncingRef.current = true;
        setIsSyncing(true);
        console.log("🔄 동기화 시작...");

        const STORES = ["chapters", "records", "categories"];
        const currentSyncTime = Date.now();
        const batch = writeBatch(firestore);
        let writeCount = 0; // 실제로 변경된 데이터 개수 체크

        for (const storeName of STORES) {
          // A. 로컬 데이터 가져오기
          const localItems = await getAllRaw(storeName);

          // B. Firestore 데이터 가져오기
          const ref = collection(firestore, "users", uid, storeName);
          const snapshot = await getDocs(ref);
          const remoteItemsMap = new Map();

          snapshot.forEach((doc) => {
            remoteItemsMap.set(doc.id, normalizeFirestoreData(doc.data()));
          });

          // C. 로컬 -> 서버 (Push)
          for (const localItem of localItems) {
            const rawId = storeName === "chapters" ? localItem.chapterId : localItem.id;
            if (!rawId) continue;

            const docId = String(rawId);
            const remoteItem = remoteItemsMap.get(docId);

            const localTime = getTime(localItem.updatedAt);
            const remoteTime = remoteItem ? getTime(remoteItem.updatedAt) : -1;

            // [핵심 수정 2] 로컬이 '확실히' 더 최신일 때만 서버 업데이트 (같으면 무시)
            if (!remoteItem || localTime > remoteTime) {
              const docRef = doc(firestore, "users", uid, storeName, docId);
              batch.set(docRef, { ...localItem });
              writeCount++;
            }
          }

          // D. 서버 -> 로컬 (Pull)
          for (const [docId, remoteItem] of remoteItemsMap) {
            const localItem = localItems.find((item) => {
              const itemId = storeName === "chapters" ? item.chapterId : item.id;
              return String(itemId) === docId;
            });

            const localTime = localItem ? getTime(localItem.updatedAt) : -1;
            const remoteTime = getTime(remoteItem.updatedAt);

            // 서버가 더 최신이거나 로컬에 없으면 로컬 업데이트
            if (!localItem || remoteTime > localTime) {
              // silent=true로 이벤트 발생 차단 (무한 루프 방지)
              await put(storeName, remoteItem, true);
            }
          }
        }

        // 변경사항이 있을 때만 커밋 (과금 방지)
        if (writeCount > 0) {
          console.log(`🔥 Firestore에 ${writeCount}건 저장 (비용 발생)`);
          await batch.commit();
        } else {
          console.log("👍 서버와 동기화됨 (변경사항 없음)");
        }

        localStorage.setItem(`lastSyncTime_${uid}`, currentSyncTime);
        console.log("✅ 동기화 완료");

      } catch (error) {
        console.error("❌ 동기화 실패:", error);
      } finally {
        setIsSyncing(false);
        isSyncingRef.current = false;
      }
    },
    [localDb, getAllRaw, put]
  );

  // =================================================================
  // [Mode 2] 비로그인 유저용: 수동 백업/복원 (기존 코드 유지)
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
      version: 4,
    };

    const rawData = JSON.stringify(data);
    const compressed = LZString.compressToUTF16(rawData);
    const encrypted = CryptoJS.AES.encrypt(compressed, password).toString();

    if (!UPLOAD_URL) {
      console.warn("REACT_APP_UPLOAD_URL 미설정");
      return "TEST12";
    }

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
    if (!DOWNLOAD_URL) throw new Error("다운로드 서버 URL이 설정되지 않았습니다.");

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
    if (!decrypted) throw new Error("비밀번호 불일치 또는 데이터 손상");

    const serverData = JSON.parse(LZString.decompressFromUTF16(decrypted));

    const mergeStore = async (storeName, items) => {
      for (const item of items) {
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
    syncWithFirestore,
    backupManual,
    restoreManual,
  };
}