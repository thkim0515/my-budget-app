import { useEffect, useState, useCallback, useMemo } from "react";
import Header from "../../components/UI/Header";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { DEFAULT_CATEGORIES } from "../../constants/categories";

// [수정 1] 파이어베이스 연동을 위한 import 추가
import { collection, addDoc, deleteDoc, doc, getDocs, query, where } from "firebase/firestore";
import { db as firestoreDb, auth } from "../../db/firebase";

import * as S from "./CategorySettingsPage.stlyes"; // 오타 수정 권장 (stlyes -> styles) 하지만 파일명이 그렇다면 유지

export default function CategorySettingsPage() {
  const { db, getAll, add, deleteItem } = useBudgetDB();
  const [categories, setCategories] = useState([]); // DB에서 가져온 '사용자 추가' 카테고리들
  const [newCat, setNewCat] = useState("");

  // 1. 카테고리 목록 로드 (로컬 DB + 서버 DB 하이브리드)
  const loadCategories = useCallback(async () => {
    // A. 로그인 상태라면 서버에서 최신 사용자 카테고리 가져오기 (싱크 문제 해결)
    if (auth.currentUser) {
      try {
        // 경로: categories 컬렉션 (userId 필드로 구분하거나 서브컬렉션 사용)
        // 여기서는 'categories' 컬렉션에 userId 필드를 넣는 방식을 가정하고 작성합니다.
        // 만약 구조가 다르다면 맞춰야 하지만, 일반적인 패턴으로 구현합니다.
        const q = query(collection(firestoreDb, "categories"), where("userId", "==", auth.currentUser.uid));
        const querySnapshot = await getDocs(q);
        const serverCategories = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

        setCategories(serverCategories);
        return; // 서버에서 가져왔으면 로컬 로드 건너뜀 (선택사항)
      } catch (error) {
        console.error("서버 카테고리 로드 실패:", error);
      }
    }

    // B. 비로그인 혹은 서버 실패 시 로컬 DB 사용
    if (db) {
      const rows = await getAll("categories");
      setCategories(rows);
    }
  }, [db, getAll]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 2. 화면 표시용 데이터 분리
  // customCategories: DB에서 불러온 것 중 '기본 카테고리' 이름과 겹치지 않는 것만 필터링
  // (이 로직이 있으면 DB에 실수로 '식비'가 들어가 있어도 화면엔 하나만 나옵니다)
  const customCategories = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => {
      // 기본 카테고리에 없는 이름만 사용자 카테고리로 취급
      if (!DEFAULT_CATEGORIES.includes(cat.name)) {
        map.set(cat.name, cat);
      }
    });
    return Array.from(map.values());
  }, [categories]);

  // 3. 새 카테고리 추가 (서버 동기화 추가)
  const addCategory = async () => {
    const trimmedName = newCat.trim();
    if (!trimmedName) return;

    // 중복 체크 (기본 + 사용자 정의 모두 확인)
    if (DEFAULT_CATEGORIES.includes(trimmedName)) {
      alert("이미 기본 카테고리에 존재하는 이름입니다.");
      return;
    }
    const isDuplicate = customCategories.some((cat) => cat.name === trimmedName);
    if (isDuplicate) {
      alert("이미 추가된 카테고리입니다.");
      return;
    }

    const newCategoryObj = {
      name: trimmedName,
      userId: auth.currentUser ? auth.currentUser.uid : "local", // 유저 ID 포함
      createdAt: new Date(),
    };

    // [수정 2] 서버 저장 (로그인 시)
    if (auth.currentUser) {
      try {
        const docRef = await addDoc(collection(firestoreDb, "categories"), newCategoryObj);
        // 로컬 DB에도 저장 (ID 맞춰서)
        await add("categories", { ...newCategoryObj, id: docRef.id });
      } catch (e) {
        console.error("서버 저장 실패", e);
        // 실패해도 로컬엔 저장
        await add("categories", newCategoryObj);
      }
    } else {
      // 비로그인 시 로컬만
      await add("categories", newCategoryObj);
    }

    setNewCat("");
    loadCategories();
  };

  // 4. 카테고리 삭제 (서버 동기화 추가)
  const deleteCategory = async (id, name) => {
    if (DEFAULT_CATEGORIES.includes(name)) {
      alert("기본 카테고리는 삭제할 수 없습니다.");
      return;
    }

    if (!window.confirm(`"${name}" 카테고리를 삭제하시겠습니까?`)) return;

    // [수정 3] 서버 삭제 (로그인 시)
    if (auth.currentUser) {
      try {
        await deleteDoc(doc(firestoreDb, "categories", id));
      } catch (e) {
        console.error("서버 삭제 실패 (이미 없거나 권한 문제)", e);
      }
    }

    // 로컬 삭제
    await deleteItem("categories", id);
    loadCategories();
  };

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header title="카테고리 관리" />
      </S.HeaderFix>

      <S.Content>
        {/* 입력 섹션 */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <S.InputBox placeholder="새 카테고리 입력" value={newCat} onChange={(e) => setNewCat(e.target.value)} style={{ flex: 1, marginBottom: 0 }} />
          <S.Btn onClick={addCategory} style={{ width: "auto", padding: "0 20px" }}>
            추가
          </S.Btn>
        </div>

        {/* 기본 카테고리 섹션 (상수 사용) */}
        <h3 style={{ marginBottom: "10px" }}>기본 카테고리</h3>
        <S.DefaultGrid>
          {DEFAULT_CATEGORIES.map((name) => (
            <S.DefaultTag key={name}>{name}</S.DefaultTag>
          ))}
        </S.DefaultGrid>

        {/* 사용자 추가 카테고리 섹션 (DB 데이터) */}
        <h3 style={{ marginTop: "30px", marginBottom: "10px" }}>사용자 추가 카테고리</h3>
        <S.List>
          {customCategories.map((cat) => (
            <S.Item key={cat.id}>
              <span>{cat.name}</span>
              <S.DeleteBtn onClick={() => deleteCategory(cat.id, cat.name)}>삭제</S.DeleteBtn>
            </S.Item>
          ))}

          {customCategories.length === 0 && <p style={{ color: "#999", fontSize: "14px", textAlign: "center", marginTop: "10px" }}>추가된 카테고리가 없습니다.</p>}
        </S.List>
      </S.Content>
    </S.PageWrap>
  );
}
