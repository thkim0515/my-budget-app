import { openDB } from 'idb';
import { DEFAULT_CATEGORIES } from '../constants/categories';

// 중복 초기화를 방지하기 위한 변수
let dbPromise = null;

export const initDB = async () => {
  if (dbPromise) return dbPromise; // 이미 초기화 중이라면 기존 프로미스 반환

  dbPromise = openDB('budgetDB', 3, {
    // 4번째 인자인 transaction을 가져옵니다.
    upgrade(db, oldVersion, newVersion, transaction) {
      if (!db.objectStoreNames.contains('chapters')) {
        db.createObjectStore('chapters', {
          keyPath: 'chapterId',
          autoIncrement: true
        });
      }

      if (!db.objectStoreNames.contains('records')) {
        const recordStore = db.createObjectStore('records', {
          keyPath: 'id',
          autoIncrement: true
        });
        recordStore.createIndex('chapterId', 'chapterId');
      }

      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', {
          keyPath: 'id',
          autoIncrement: true
        });
      }

      // 수정된 로직: db.transaction() 대신 인자로 받은 transaction 사용
      if (oldVersion < 3) {
        const categoryStore = transaction.objectStore('categories');
        DEFAULT_CATEGORIES.forEach(c => {
          categoryStore.put({ 
            name: c, 
            updatedAt: Date.now(), 
            isDeleted: false 
          });
        });
      }
    }
  });

  return dbPromise;
};