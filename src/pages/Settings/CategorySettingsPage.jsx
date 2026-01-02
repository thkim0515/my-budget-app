import { useEffect, useState, useCallback, useMemo } from "react";
import Header from "../../components/UI/Header";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { DEFAULT_CATEGORIES } from "../../constants/categories";
import { auth } from "../../db/firebase";

import * as S from "./CategorySettingsPage.stlyes";

export default function CategorySettingsPage() {
  const { db, getAll, add, put, deleteItem } = useBudgetDB();
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState("");

  // 1. 카테고리 로드 (IndexedDB 기반 - useSync가 서버와 맞춰줄 것임)
  const loadCategories = useCallback(async () => {
    if (db) {
      const rows = await getAll("categories");
      setCategories(rows);
    }
  }, [db, getAll]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // 2. 사용자 정의 카테고리만 필터링
  const customCategories = useMemo(() => {
    return categories.filter((cat) => !DEFAULT_CATEGORIES.includes(cat.name) && !cat.isDeleted);
  }, [categories]);

  // 3. 새 카테고리 추가
  const addCategory = async () => {
    const trimmedName = newCat.trim();
    if (!trimmedName) return;

    if (DEFAULT_CATEGORIES.includes(trimmedName)) {
      alert("기본 카테고리에 존재하는 이름입니다.");
      return;
    }
    if (customCategories.some((cat) => cat.name === trimmedName)) {
      alert("이미 추가된 카테고리입니다.");
      return;
    }

    const newCategoryObj = {
      id: `cat_${Date.now()}`, // 고유 ID 생성
      name: trimmedName,
      updatedAt: Date.now(), // [중요] 증분 동기화 트리거
      createdAt: new Date(),
      isDeleted: false,
    };

    // IndexedDB에 저장 (useSync가 나중에 서버로 전송)
    await add("categories", newCategoryObj);

    setNewCat("");
    loadCategories();
    // 동기화 이벤트 발생 (다른 기기 전송 준비)
    window.dispatchEvent(new CustomEvent("budget-db-updated"));
  };

  // 4. 카테고리 삭제 (Soft Delete 적용)
  const deleteCategory = async (cat) => {
    if (!window.confirm(`"${cat.name}" 카테고리를 삭제하시겠습니까?`)) return;

    // 증분 동기화를 위해 삭제 플래그와 updatedAt 갱신
    await put("categories", { ...cat, isDeleted: true, updatedAt: Date.now() });
    loadCategories();
    window.dispatchEvent(new CustomEvent("budget-db-updated"));
  };

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header title="카테고리 관리" />
      </S.HeaderFix>

      <S.Content>
        {/* [순서 변경 1] 기본 카테고리 섹션 */}
        <S.SectionTitle>기본 카테고리</S.SectionTitle>
        <S.DefaultGrid>
          {DEFAULT_CATEGORIES.map((name) => (
            <S.DefaultTag key={name}>{name}</S.DefaultTag>
          ))}
        </S.DefaultGrid>

        {/* [순서 변경 2] 카테고리 추가 섹션 (높이 불일치 해결됨) */}
        <S.SectionTitle>카테고리 추가</S.SectionTitle>
        <S.InputRow>
          <S.InputBox placeholder="카테고리 이름" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <S.AddBtn onClick={addCategory}>추가</S.AddBtn>
        </S.InputRow>

        {/* [순서 변경 3] 사용자 추가 카테고리 목록 */}
        <S.SectionTitle>내가 만든 카테고리</S.SectionTitle>
        <S.List>
          {customCategories.map((cat) => (
            <S.Item key={cat.id}>
              <span>{cat.name}</span>
              <S.DeleteBtn onClick={() => deleteCategory(cat)}>삭제</S.DeleteBtn>
            </S.Item>
          ))}
          {customCategories.length === 0 && <S.EmptyMsg>추가된 카테고리가 없습니다.</S.EmptyMsg>}
        </S.List>
      </S.Content>
    </S.PageWrap>
  );
}
