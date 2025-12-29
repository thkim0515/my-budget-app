import { openDB } from 'idb';
import { DEFAULT_CATEGORIES } from '../constants/categories';

export const initDB = async () => {
  // 버전을 2에서 3으로 올립니다.
  return openDB('budgetDB', 3, {
    upgrade(db, oldVersion) {
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

      // 버전 3 업그레이드 로직: 기존 데이터에 필드 추가가 필요할 경우 여기서 처리할 수 있습니다.
      // 초기 카테고리 주입 시에도 updatedAt, isDeleted 추가
      if (oldVersion < 3) {
        const tx = db.transaction('categories', 'readwrite');
        const store = tx.objectStore('categories');
        DEFAULT_CATEGORIES.forEach(c => {
          store.put({ 
            name: c, 
            updatedAt: Date.now(), 
            isDeleted: false 
          });
        });
      }
    }
  });
};