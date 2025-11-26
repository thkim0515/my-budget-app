import { useEffect, useState, useCallback } from 'react';
import { initDB } from '../db/indexedDB';

export function useBudgetDB() {
  const [db, setDb] = useState(null);

  // 컴포넌트 마운트 시 DB 초기화
  useEffect(() => {
    const setup = async () => {
      try {
        const database = await initDB();
        setDb(database);
      } catch (err) {
        console.error("DB 초기화 실패:", err);
      }
    };
    setup();
  }, []);

  // [조회] 모든 데이터 가져오기
  const getAll = useCallback(async (storeName) => {
    if (!db) return [];
    return await db.getAll(storeName);
  }, [db]);

  // [조회] 특정 인덱스로 데이터 가져오기 (예: chapterId로 내역 조회)
  const getAllFromIndex = useCallback(async (storeName, indexName, key) => {
    if (!db) return [];
    return await db.getAllFromIndex(storeName, indexName, key);
  }, [db]);

  // [추가] 데이터 추가
  const add = useCallback(async (storeName, value) => {
    if (!db) return;
    return await db.add(storeName, value);
  }, [db]);

  // [수정] 데이터 업데이트
  const put = useCallback(async (storeName, value) => {
    if (!db) return;
    return await db.put(storeName, value);
  }, [db]);

  // [삭제] 데이터 삭제
  const deleteItem = useCallback(async (storeName, key) => {
    if (!db) return;
    return await db.delete(storeName, key);
  }, [db]);

  // [초기화] 스토어 비우기
  const clear = useCallback(async (storeName) => {
    if (!db) return;
    return await db.clear(storeName);
  }, [db]);

  return { 
    db, // 직접 트랜잭션이 필요한 경우를 위해 db 객체도 반환
    getAll, 
    getAllFromIndex, 
    add, 
    put, 
    deleteItem, 
    clear 
  };
}