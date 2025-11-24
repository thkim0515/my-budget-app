import { openDB } from 'idb';

export const initDB = async () => {
  return openDB('budgetDB', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('chapters')) {
        const chapterStore = db.createObjectStore('chapters', {
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
    }
  });
};
