import { useEffect, useState } from "react";
import { initDB } from "../db/indexedDB";
import { auth, db as firestoreDB } from "../db/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot, // ★ 추가됨: 실시간 감시 함수
  serverTimestamp,
} from "firebase/firestore";

export function useBudgetDB() {
  const [localDb, setLocalDb] = useState(null);
  const [user, setUser] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  // 1. 로컬 DB 초기화
  useEffect(() => {
    initDB().then(setLocalDb);
  }, []);

  // 2. 로그인 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  // 헬퍼: 컬렉션 참조
  const getCollectionRef = (store) => {
    if (!user) return null;
    return collection(firestoreDB, "users", user.uid, store);
  };

  // --- [REAL-TIME] 실시간 구독 기능 (추가됨) ---
  // 사용법: useEffect 안에서 사용하며, 변경사항이 생길 때마다 callback이 실행됨
  const subscribe = (store, callback) => {
    if (user) {
      // 🅰️ 로그인 상태: Firestore 실시간 감시
      // 삭제되지 않은 데이터만 구독
      const q = query(getCollectionRef(store), where("isDeleted", "==", false));

      // onSnapshot은 '구독 해제 함수(unsubscribe)'를 반환함
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(items); // 데이터가 바뀔 때마다 화면 갱신
      });

      return unsubscribe; // 컴포넌트가 꺼질 때 구독 취소용
    } else {
      // 🅱️ 비로그인 상태: IndexedDB (실시간 X, 1회성 조회)
      // 로컬 DB는 브라우저 한계로 실시간 감지가 어려워 1회 조회로 대체
      if (localDb) {
        getAll(store).then(callback);
      }
      return () => {}; // 빈 함수 반환 (에러 방지)
    }
  };

  // --- [READ] 1회성 조회 (기존 유지) ---
  const getAll = async (store) => {
    if (user) {
      try {
        const q = query(getCollectionRef(store), where("isDeleted", "==", false));
        const snapshot = await getDocs(q);
        return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      } catch (e) {
        console.error("Firestore Read Error:", e);
        return [];
      }
    } else {
      if (!localDb) return [];
      const all = await localDb.getAll(store);
      return all.filter((item) => !item.isDeleted);
    }
  };

  // ... (getAllRaw, getAllFromIndex, get 함수들은 기존과 동일하게 유지하거나 필요 시 위 subscribe 패턴 참고) ...
  const getAllRaw = async (store) => {
    if (user) {
      const snapshot = await getDocs(getCollectionRef(store));
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      if (!localDb) return [];
      return await localDb.getAll(store);
    }
  };

  const getAllFromIndex = async (store, index, value) => {
    if (user) {
      const q = query(getCollectionRef(store), where(index, "==", value), where("isDeleted", "==", false));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    } else {
      if (!localDb) return [];
      const results = await localDb.getAllFromIndex(store, index, value);
      return results.filter((item) => !item.isDeleted);
    }
  };

  const get = async (store, id) => {
    if (user) {
      const docRef = doc(firestoreDB, "users", user.uid, store, String(id));
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        return !data.isDeleted ? { id: docSnap.id, ...data } : null;
      }
      return null;
    } else {
      if (!localDb) return null;
      const item = await localDb.get(store, id);
      return item && !item.isDeleted ? item : null;
    }
  };

  // --- [WRITE] 데이터 쓰기 (기존 유지) ---
  const add = async (store, data) => {
    const now = Date.now();
    const newItem = { ...data, updatedAt: now, isDeleted: false };

    if (user) {
      const docRef = await addDoc(getCollectionRef(store), newItem);
      return { ...newItem, id: docRef.id };
    } else {
      if (!localDb) return;
      const id = await localDb.add(store, newItem);
      return { ...newItem, id };
    }
  };

  const put = async (store, data) => {
    const now = Date.now();
    const updatedItem = { ...data, updatedAt: now };

    if (user) {
      if (!data.id) throw new Error("Update requires an ID");
      const docRef = doc(firestoreDB, "users", user.uid, store, String(data.id));
      await setDoc(docRef, updatedItem, { merge: true });
      return updatedItem;
    } else {
      if (!localDb) return;
      await localDb.put(store, updatedItem);
      return updatedItem;
    }
  };

  const deleteItem = async (store, id) => {
    const now = Date.now();
    if (user) {
      const docRef = doc(firestoreDB, "users", user.uid, store, String(id));
      await setDoc(docRef, { isDeleted: true, updatedAt: now }, { merge: true });
    } else {
      if (!localDb) return;
      const item = await localDb.get(store, id);
      if (item) {
        await localDb.put(store, { ...item, isDeleted: true, updatedAt: now });
      }
    }
  };

  const clear = async (store) => {
    if (user) {
      console.warn("Firestore collection clear not implemented");
    } else {
      if (!localDb) return;
      return await localDb.clear(store);
    }
  };

  return {
    db: localDb,
    user,
    isAuthReady,
    subscribe, // ★ 내보내기 필수
    get,
    getAll,
    getAllRaw,
    getAllFromIndex,
    add,
    put,
    deleteItem,
    clear,
  };
}
