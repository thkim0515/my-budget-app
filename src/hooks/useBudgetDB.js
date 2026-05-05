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

  const mapRecord = (store, data, providedId) => {
    const now = Date.now();
    const id = providedId || data.id || data.chapterId || crypto.randomUUID();
    const item = {
      ...data,
      updatedAt: now,
      isDeleted: false,
    };

    if (store === "chapters") {
      item.chapterId = id;
    } else {
      item.id = id;
    }

    return item;
  };

  // [수정] silent 옵션 추가: true일 경우 이벤트 발생 안 함 (무한 루프 방지)
  const add = useCallback(
    async (store, data, silent = false) => {
      if (!db) return;
      const itemToSave = mapRecord(store, data);
      await db.add(store, itemToSave);

      if (!silent) {
        window.dispatchEvent(new CustomEvent("budget-db-updated"));
      }

      return store === "chapters" ? itemToSave.chapterId : itemToSave.id;
    },
    [db]
  );

  const addMany = useCallback(
    async (store, items = [], silent = false) => {
      if (!db) return [];

      const savedIds = [];
      for (const item of items) {
        const itemToSave = mapRecord(store, item);
        const hasKey = store === "chapters" ? item.chapterId : item.id;
        const key = hasKey || itemToSave.chapterId || itemToSave.id;
        if (key) {
          itemToSave[store === "chapters" ? "chapterId" : "id"] = key;
        }
        await db.add(store, itemToSave);
        savedIds.push(store === "chapters" ? itemToSave.chapterId : itemToSave.id);
      }

      if (!silent) {
        window.dispatchEvent(new CustomEvent("budget-db-updated"));
      }

      return savedIds;
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

  const putMany = useCallback(
    async (store, items = [], silent = false) => {
      if (!db) return [];

      const results = [];
      for (const item of items) {
        const result = await db.put(store, {
          ...item,
          updatedAt: Date.now(),
        });
        results.push(result);
      }

      if (!silent) {
        window.dispatchEvent(new CustomEvent("budget-db-updated"));
      }

      return results;
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
      addMany,
      add,
      put,
      putMany,
      deleteItem,
      clear,
    };
  }
