import { useEffect, useState, useCallback } from "react";
import { initDB } from "../db/indexedDB";

export function useBudgetDB() {
  const [db, setDb] = useState(null);

  useEffect(() => {
    initDB().then(setDb);
  }, []);

  const getAll = useCallback(
    async (store) => {
      if (!db) return [];
      const all = await db.getAll(store);
      return all.filter((item) => !item.isDeleted);
    },
    [db]
  );

  const getAllRaw = useCallback(
    async (store) => {
      if (!db) return [];
      return await db.getAll(store);
    },
    [db]
  );

  const getAllFromIndex = useCallback(
    async (store, index, value) => {
      if (!db) return [];
      const results = await db.getAllFromIndex(store, index, value);
      return results.filter((item) => !item.isDeleted);
    },
    [db]
  );

  const get = useCallback(
    async (store, id) => {
      if (!db) return null;
      const item = await db.get(store, id);
      return item && !item.isDeleted ? item : null;
    },
    [db]
  );

  // [수정] silent 옵션 추가: true일 경우 이벤트 발생 안 함 (무한 루프 방지)
  const add = useCallback(
    async (store, data, silent = false) => {
      if (!db) return;
      const now = Date.now();
      const id = data.id || crypto.randomUUID();

      const itemToSave = {
        ...data,
        updatedAt: now,
        isDeleted: false,
      };

      if (store === "chapters") {
        itemToSave.chapterId = id;
      } else {
        itemToSave.id = id;
      }

      await db.add(store, itemToSave);

      if (!silent) {
        window.dispatchEvent(new CustomEvent("budget-db-updated"));
      }

      return id;
    },
    [db]
  );

  // [수정] silent 옵션 추가
  const put = useCallback(
    async (store, data, silent = false) => {
      if (!db) return;
      const result = await db.put(store, {
        ...data,
        updatedAt: Date.now(),
      });

      if (!silent) {
        window.dispatchEvent(new CustomEvent("budget-db-updated"));
      }
      return result;
    },
    [db]
  );

  // [수정] silent 옵션 추가
  const deleteItem = useCallback(
    async (store, id, silent = false) => {
      if (!db) return;
      const item = await db.get(store, id);
      if (item) {
        await db.put(store, {
          ...item,
          isDeleted: true,
          updatedAt: Date.now(),
        });

        if (!silent) {
          window.dispatchEvent(new CustomEvent("budget-db-updated"));
        }
      }
    },
    [db]
  );

  const clear = useCallback(
    async (store) => {
      if (!db) return;
      await db.clear(store);
      window.dispatchEvent(new CustomEvent("budget-db-updated"));
    },
    [db]
  );

  return {
    db,
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
