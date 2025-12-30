import { useEffect, useState, useCallback, useMemo } from "react";
import Header from "../../components/UI/Header";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { DEFAULT_CATEGORIES } from "../../constants/categories";

import * as S from "./CategorySettingsPage.stlyes";

export default function CategorySettingsPage() {
  const { db, getAll, add, deleteItem } = useBudgetDB();
  const [categories, setCategories] = useState([]);
  const [newCat, setNewCat] = useState("");

  // 1. 카테고리 목록 로드
  const loadCategories = useCallback(async () => {
    // useBudgetDB의 getAll은 이미 isDeleted가 false인 데이터만 가져옵니다.
    const rows = await getAll("categories");
    setCategories(rows);
  }, [getAll]);

  // DB 준비 시 로드
  useEffect(() => {
    if (db) {
      loadCategories();
    }
  }, [db, loadCategories]);

  // 2. 화면 표시용 데이터 가공 (이름 기준 중복 제거)
  // DB에 "식비"가 여러 개 있어도 화면에는 가장 최근(혹은 하나)만 보여줍니다.
  const uniqueCategories = useMemo(() => {
    const map = new Map();
    categories.forEach((cat) => {
      // 이름이 같으면 뒤에 나오는 데이터로 덮어씌워 유일성 유지
      map.set(cat.name, cat);
    });
    return Array.from(map.values());
  }, [categories]);

  // 3. 새 카테고리 추가 (중복 방지 로직 포함)
  const addCategory = async () => {
    const trimmedName = newCat.trim();
    if (!trimmedName) return;

    // 이미 존재하는 이름인지 확인 (대소문자/공백 구분 없이 체크하려면 toLowerCase() 등 활용 가능)
    const isDuplicate = categories.some((cat) => cat.name === trimmedName);

    if (isDuplicate) {
      alert("이미 존재하는 카테고리입니다.");
      return;
    }

    await add("categories", { name: trimmedName });
    setNewCat("");
    loadCategories();
  };

  // 4. 카테고리 삭제 (기본 카테고리 보호)
  const deleteCategory = async (id, name) => {
    if (DEFAULT_CATEGORIES.includes(name)) {
      alert(`"${name}"는 시스템 기본 카테고리이므로 삭제할 수 없습니다.`);
      return;
    }

    if (!window.confirm(`"${name}" 카테고리를 삭제하시겠습니까?`)) return;

    // useBudgetDB의 deleteItem은 내부적으로 isDeleted: true로 업데이트합니다.
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
          <S.InputBox
            placeholder="새 카테고리 입력"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            style={{ flex: 1, marginBottom: 0 }}
          />
          <S.Btn onClick={addCategory} style={{ width: "auto", padding: "0 20px" }}>
            추가
          </S.Btn>
        </div>

        {/* 기본 카테고리 섹션 */}
        <h3 style={{ marginBottom: "10px" }}>기본 카테고리</h3>
        <S.DefaultGrid>
          {uniqueCategories
            .filter((cat) => DEFAULT_CATEGORIES.includes(cat.name))
            .map((cat) => (
              <S.DefaultTag key={cat.id}>{cat.name}</S.DefaultTag>
            ))}
        </S.DefaultGrid>

        {/* 추가된 카테고리 섹션 */}
        <h3 style={{ marginTop: "30px", marginBottom: "10px" }}>
          사용자 추가 카테고리
        </h3>
        <S.List>
          {uniqueCategories
            .filter((cat) => !DEFAULT_CATEGORIES.includes(cat.name))
            .map((cat) => (
              <S.Item key={cat.id}>
                <span>{cat.name}</span>
                <S.DeleteBtn onClick={() => deleteCategory(cat.id, cat.name)}>
                  삭제
                </S.DeleteBtn>
              </S.Item>
            ))}
          {uniqueCategories.filter((cat) => !DEFAULT_CATEGORIES.includes(cat.name)).length === 0 && (
            <p style={{ color: "#999", fontSize: "14px", textAlign: "center", marginTop: "10px" }}>
              추가된 카테고리가 없습니다.
            </p>
          )}
        </S.List>
      </S.Content>
    </S.PageWrap>
  );
}