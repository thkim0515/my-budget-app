import { useState, useCallback, useRef } from "react";
import { db as firestore } from "../db/firebase";
import { collection, doc, writeBatch, getDocs, query, where } from "firebase/firestore";
import { useBudgetDB } from "./useBudgetDB";
import CryptoJS from "crypto-js";
import LZString from "lz-string";

// =================================================================
// [설정 플래그]
// true: 변경된 데이터만 동기화 (비용 절감, 효율적)
// false: 기존처럼 모든 데이터를 전수 조사하여 동기화 (안전하지만 비용 발생)
// =================================================================
const USE_INCREMENTAL_SYNC = true;

/**
 * [헬퍼] 날짜 형식을 비교 가능한 숫자(ms)로 변환
 */
const getTime = (dateOrTimestamp) => {
  if (!dateOrTimestamp) return 0;
  if (typeof dateOrTimestamp.toMillis === "function") return dateOrTimestamp.toMillis();
  if (dateOrTimestamp instanceof Date) return dateOrTimestamp.getTime();
  if (typeof dateOrTimestamp === "number") return dateOrTimestamp;
  return 0;
};

/**
 * [헬퍼] Firestore 데이터를 정규화
 */
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
  // [Mode 1] 구글 로그인 유저용: Firestore 동기화 (플래그에 따라 모드 전환)
  // =================================================================
  const syncWithFirestore = useCallback(
    async (uid) => {
      if (!localDb || !uid || isSyncingRef.current) return;

      try {
        isSyncingRef.current = true;
        setIsSyncing(true);
        console.log(`🔄 동기화 시작 (모드: ${USE_INCREMENTAL_SYNC ? "증분" : "전체"})`);

        const lastSyncKey = `lastSyncTime_${uid}`;
        const lastSyncTime = parseInt(localStorage.getItem(lastSyncKey) || "0", 10);
        const currentSyncStartTime = Date.now();

        const STORES = ["chapters", "records", "categories"];
        const batch = writeBatch(firestore);
        let writeCount = 0;

        for (const storeName of STORES) {
          // A. 로컬 데이터 가져오기
          const localItems = await getAllRaw(storeName);
          const ref = collection(firestore, "users", uid, storeName);

          let remoteItemsMap = new Map();

          // [분기 로직] 1. 서버 데이터 가져오기 (Pull 준비)
          if (USE_INCREMENTAL_SYNC) {
            // 증분 모드: 마지막 동기화 이후의 것만 쿼리
            const q = query(ref, where("updatedAt", ">", lastSyncTime));
            const snapshot = await getDocs(q);
            snapshot.forEach((doc) => remoteItemsMap.set(doc.id, normalizeFirestoreData(doc.data())));
          } else {
            // 전체 모드: 모든 서버 데이터 가져오기
            const snapshot = await getDocs(ref);
            snapshot.forEach((doc) => remoteItemsMap.set(doc.id, normalizeFirestoreData(doc.data())));
          }

          // [분기 로직] 2. 로컬 -> 서버 (Push)
          // 증분 모드면 로컬도 updatedAt으로 필터링, 전체 모드면 전수 조사
          const itemsToPush = USE_INCREMENTAL_SYNC ? localItems.filter((item) => getTime(item.updatedAt) > lastSyncTime) : localItems;

          for (const localItem of itemsToPush) {
            const rawId = storeName === "chapters" ? localItem.chapterId : localItem.id;
            if (!rawId) continue;

            const docId = String(rawId);
            const localTime = getTime(localItem.updatedAt);

            if (USE_INCREMENTAL_SYNC) {
              // 증분 모드: 필터링된 건 무조건 업데이트
              const docRef = doc(firestore, "users", uid, storeName, docId);
              batch.set(docRef, { ...localItem });
              writeCount++;
            } else {
              // 전체 모드: 서버 데이터와 일일이 시간 대조
              const remoteItem = remoteItemsMap.get(docId);
              const remoteTime = remoteItem ? getTime(remoteItem.updatedAt) : -1;
              if (!remoteItem || localTime > remoteTime) {
                const docRef = doc(firestore, "users", uid, storeName, docId);
                batch.set(docRef, { ...localItem });
                writeCount++;
              }
            }
          }

          // 3. 서버 -> 로컬 (Pull 실행)
          for (const [docId, remoteItem] of remoteItemsMap) {
            const localItem = localItems.find((item) => {
              const itemId = storeName === "chapters" ? item.chapterId : item.id;
              return String(itemId) === docId;
            });

            const localTime = localItem ? getTime(localItem.updatedAt) : -1;
            const remoteTime = getTime(remoteItem.updatedAt);

            // 서버가 더 최신이면 로컬 갱신
            if (!localItem || remoteTime > localTime) {
              await put(storeName, remoteItem, true);
            }
          }
        }

        if (writeCount > 0) {
          console.log(`🔥 Firestore에 ${writeCount}건 저장 완료`);
          await batch.commit();
        } else {
          console.log("👍 동기화 완료 (변경사항 없음)");
        }

        localStorage.setItem(lastSyncKey, currentSyncStartTime.toString());
        window.dispatchEvent(new CustomEvent("budget-db-updated"));
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
  // [Mode 2] 비로그인 유저용: 수동 백업/복원 (기능 유지)
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

    if (!UPLOAD_URL) return "TEST12";
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
    const bytes = CryptoJS.AES.decrypt(result.data, password);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
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

  return { isSyncing, syncWithFirestore, backupManual, restoreManual };
}
