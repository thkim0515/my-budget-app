import { useEffect, useState } from 'react';
import { initDB } from '../db/indexedDB';

export function useBudgetDB() {
  const [db, setDb] = useState(null);

  useEffect(() => {
    initDB().then(setDb);
  }, []);

  const getAll = async (store) => {
    if (!db) return [];
    return await db.getAll(store);
  };

  const getAllFromIndex = async (store, index, value) => {
    if (!db) return [];
    return await db.getAllFromIndex(store, index, value);
  };

  const get = async (store, id) => {
    if (!db) return null;
    return await db.get(store, id);
  };

  const add = async (store, data) => {
    if (!db) return;
    return await db.add(store, data);
  };

  const put = async (store, data) => {
    if (!db) return;
    return await db.put(store, data);
  };

  const deleteItem = async (store, id) => {
    if (!db) return;
    return await db.delete(store, id);
  };

  const clear = async (store) => {
    if (!db) return;
    return await db.clear(store);
  };

  return {
    db,
    get,             
    getAll,
    getAllFromIndex,
    add,
    put,
    deleteItem,
    clear
  };
}
