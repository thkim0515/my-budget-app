import { useEffect, useState } from "react";
import { initDB } from "../db/indexedDB";

export function useBudgetDB() {
  const [db, setDb] = useState(null);

  useEffect(() => {
    initDB().then(setDb);
  }, []);

  // 삭제되지 않은 데이터만 가져오도록 기본 필터링 추가
  const getAll = async (store) => {
    if (!db) return [];
    const all = await db.getAll(store);
    return all.filter((item) => !item.isDeleted);
  };

  // 동기화 등을 위해 삭제된 데이터를 포함하여 모든 데이터를 가져오는 함수 추가
  const getAllRaw = async (store) => {
    if (!db) return [];
    return await db.getAll(store);
  };

  const getAllFromIndex = async (store, index, value) => {
    if (!db) return [];
    const results = await db.getAllFromIndex(store, index, value);
    return results.filter((item) => !item.isDeleted);
  };

  const get = async (store, id) => {
    if (!db) return null;
    const item = await db.get(store, id);
    return item && !item.isDeleted ? item : null;
  };

  const add = async (store, data) => {
    if (!db) return;
    const now = Date.now();
    return await db.add(store, {
      ...data,
      updatedAt: now,
      isDeleted: false,
    });
  };

  const put = async (store, data) => {
    if (!db) return;
    return await db.put(store, {
      ...data,
      updatedAt: Date.now(),
    });
  };

  // Soft Delete 구현: 실제 삭제 대신 isDeleted를 true로 변경
  const deleteItem = async (store, id) => {
    if (!db) return;
    const item = await db.get(store, id);
    if (item) {
      await db.put(store, {
        ...item,
        isDeleted: true,
        updatedAt: Date.now(),
      });
    }
  };

  const clear = async (store) => {
    if (!db) return;
    return await db.clear(store);
  };

  return {
    db,
    get,
    getAll,
    getAllRaw, // 원본 데이터가 필요한 경우를 위해 추가
    getAllFromIndex,
    add,
    put,
    deleteItem,
    clear,
  };
}
