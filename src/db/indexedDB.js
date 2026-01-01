import { openDB } from "idb";
import { DEFAULT_CATEGORIES } from "../constants/categories";

let dbPromise = null;

export const initDB = async () => {
  if (dbPromise) return dbPromise;

  // 버전을 5로 유지 (만약 4에서 5로 넘어가는 중이라면 upgrade 실행됨)
  dbPromise = openDB("budgetDB", 5, {
    async upgrade(db, oldVersion, newVersion, transaction) {
      // 버전 5 미만일 때 (최초 설치 or 구버전) 실행
      if (oldVersion < 5) {
        // 1. 기존 스토어가 있다면 삭제 (구조 변경을 위해 과감히 초기화)
        if (db.objectStoreNames.contains("chapters")) {
          db.deleteObjectStore("chapters");
        }
        db.createObjectStore("chapters", { keyPath: "chapterId" });

        if (db.objectStoreNames.contains("records")) {
          db.deleteObjectStore("records");
        }
        const recordStore = db.createObjectStore("records", { keyPath: "id" });
        recordStore.createIndex("chapterId", "chapterId");

        if (db.objectStoreNames.contains("categories")) {
          db.deleteObjectStore("categories");
        }
        const categoryStore = db.createObjectStore("categories", { keyPath: "id" });

        // 2. 기본 카테고리 데이터 주입 (UUID 생성 필수)
        DEFAULT_CATEGORIES.forEach((c) => {
          categoryStore.put({
            id: crypto.randomUUID(), // <-- [핵심] 여기서도 UUID를 생성해야 합니다.
            name: c,
            updatedAt: Date.now(),
            isDeleted: false,
          });
        });
      }
    },
  });

  return dbPromise;
};
