import { useEffect, useState } from "react";
import Header from "../../components/Header";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { DEFAULT_CATEGORIES } from "../../constants/categories";

import * as S from './CategorySettingsPage.stlyes'

// 카테고리 설정 페이지 컴포넌트
export default function CategorySettingsPage() {
  const { db, getAll, add, deleteItem } = useBudgetDB(); // 데이터베이스 접근 훅
  const [categories, setCategories] = useState([]); // 전체 카테고리 목록
  const [newCat, setNewCat] = useState(""); // 새 카테고리 입력값

  // DB 준비 시 카테고리 로드
  useEffect(() => {
    if (db) loadCategories();
  }, [db]);

  // 카테고리 목록 가져오기
  const loadCategories = async () => {
    const rows = await getAll("categories");
    setCategories(rows);
  };

  // 새 카테고리 추가 기능
  const addCategory = async () => {
    if (!newCat.trim()) return;

    await add("categories", { name: newCat.trim() });
    setNewCat("");
    loadCategories();
  };

  // 카테고리 삭제 기능
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
        {/* 카테고리 입력창과 추가 버튼 */}
        <S.InputBox
          placeholder="새 카테고리 입력"
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
        />
        <S.Btn onClick={addCategory}>카테고리 추가</S.Btn>

        {/* 기본 카테고리 출력 */}
        <h3 style={{ marginBottom: "10px" }}>기본 카테고리</h3>
        <S.DefaultGrid>
          {categories
            .filter((cat) => DEFAULT_CATEGORIES.includes(cat.name))
            .map((cat) => (
              <S.DefaultTag key={cat.id}>{cat.name}</S.DefaultTag>
            ))}
        </S.DefaultGrid>

        {/* 추가된 카테고리 출력 */}
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
