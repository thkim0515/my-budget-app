import { openDB } from 'idb';
import { DEFAULT_CATEGORIES } from '../constants/categories';

export const initDB = async () => {
  return openDB('budgetDB', 2, {
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

      // ★ categories 스토어 추가
      if (!db.objectStoreNames.contains('categories')) {
        const categoryStore = db.createObjectStore('categories', {
          keyPath: 'id',
          autoIncrement: true
        });

        // 기본 카테고리 초기 주입
        DEFAULT_CATEGORIES.forEach(c => {
          categoryStore.put({ name: c });
        });
      }
    }
  });
};
