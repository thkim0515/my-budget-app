import { useEffect, useState, useCallback } from "react";
import Header from "../../components/Header";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { DEFAULT_CATEGORIES } from "../../constants/categories";

import * as S from "./CategorySettingsPage.stlyes";

// 카테고리 설정 페이지 컴포넌트
export default function CategorySettingsPage() {
  const { db, getAll, add, deleteItem } = useBudgetDB();
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState("");

  // 카테고리 목록 로드 (Hooks 규칙 대응)
  const loadCategories = useCallback(async () => {
    const rows = await getAll("categories");
    setCategories(rows);
  }, [getAll]);

  // DB 준비 시 카테고리 로드
  useEffect(() => {
    if (db) {
      loadCategories();
    }
  }, [db, loadCategories]);

  // 새 카테고리 추가
  const addCategory = async () => {
    if (!newCat.trim()) return;

    await add("categories", { name: newCat.trim() });
    setNewCat("");
    loadCategories();
  };

  // 카테고리 삭제
  const deleteCategory = async (id, name) => {
    if (DEFAULT_CATEGORIES.includes(name)) {
      alert(`"${name}"는 기본 제공 카테고리이며 삭제할 수 없습니다.`);
      return;
    }

    const ok = window.confirm(`${name} 카테고리를 삭제하시겠습니까`);
    if (!ok) return;

    await deleteItem("categories", id);
    loadCategories();
  };

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header title="카테고리 관리" />
      </S.HeaderFix>

      <S.Content>
        <S.InputBox
          placeholder="새 카테고리 입력"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
        />
        <S.Btn onClick={addCategory}>카테고리 추가</S.Btn>

        <h3 style={{ marginBottom: "10px" }}>기본 카테고리</h3>
        <S.DefaultGrid>
          {categories
            .filter((cat) => DEFAULT_CATEGORIES.includes(cat.name))
            .map((cat) => (
              <S.DefaultTag key={cat.id}>{cat.name}</S.DefaultTag>
            ))}
        </S.DefaultGrid>

        <h3 style={{ marginTop: "20px", marginBottom: "10px" }}>
          추가된 카테고리
        </h3>
        <S.List>
          {categories
            .filter((cat) => !DEFAULT_CATEGORIES.includes(cat.name))
            .map((cat) => (
              <S.Item key={cat.id}>
                <span>{cat.name}</span>
                <S.DeleteBtn
                  onClick={() => deleteCategory(cat.id, cat.name)}
                >
                  삭제
                </S.DeleteBtn>
              </S.Item>
            ))}
        </S.List>
      </S.Content>
    </S.PageWrap>
  );
}
