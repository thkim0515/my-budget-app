// 스타일과 훅 불러오기
import { useEffect, useState } from "react";
import styled from "styled-components";
import Header from "../components/Header";
import { useBudgetDB } from "../hooks/useBudgetDB";
import { DEFAULT_CATEGORIES } from "../constants/categories";

// 페이지 전체 레이아웃
const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  color: ${({ theme }) => theme.text};
`;

// 상단 헤더 고정 영역
const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  margin: 0 auto;
  max-width: 480px;
  z-index: 20;
`;

// 본문 스크롤 영역
const Content = styled.div`
  flex: 1;
  padding: 16px;
  padding-top: 96px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
  overflow-y: auto;
`;

// 카테고리 입력창
const InputBox = styled.input`
  width: 100%;
  padding: 10px;
  margin-bottom: 12px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
`;

// 등록 버튼
const Btn = styled.button`
  width: 100%;
  padding: 12px;
  background: #1976d2;
  color: white;
  border: none;
  border-radius: 6px;
  margin-bottom: 16px;
`;

// 기본 카테고리 보여주는 그리드
const DefaultGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 20px;
`;

// 기본 카테고리 태그
const DefaultTag = styled.div`
  width: 25%;
  padding: 10px;
  text-align: center;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 6px;
  box-sizing: border-box;
  min-height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
`;

// 추가 카테고리 리스트
const List = styled.ul`
  margin-top: 16px;
  padding: 0;
  list-style: none;
`;

// 추가 카테고리 아이템
const Item = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  margin-bottom: 10px;
  background: ${({ theme }) => theme.card};
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border};
`;

// 삭제 버튼
const DeleteBtn = styled.button`
  padding: 6px 10px;
  background: #d9534f;
  color: white;
  border: none;
  border-radius: 4px;
`;

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
    <PageWrap>
      <HeaderFix>
        <Header title="카테고리 관리" />
      </HeaderFix>

      <Content>
        {/* 카테고리 입력창과 추가 버튼 */}
        <InputBox placeholder="새 카테고리 입력" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
        <Btn onClick={addCategory}>카테고리 추가</Btn>

        {/* 기본 카테고리 출력 */}
        <h3 style={{ marginBottom: "10px" }}>기본 카테고리</h3>
        <DefaultGrid>
          {categories
            .filter((cat) => DEFAULT_CATEGORIES.includes(cat.name))
            .map((cat) => (
              <DefaultTag key={cat.id}>{cat.name}</DefaultTag>
            ))}
        </DefaultGrid>

        {/* 추가된 카테고리 출력 */}
        <h3 style={{ marginTop: "20px", marginBottom: "10px" }}>추가된 카테고리</h3>
        <List>
          {categories
            .filter((cat) => !DEFAULT_CATEGORIES.includes(cat.name))
            .map((cat) => (
              <Item key={cat.id}>
                <span>{cat.name}</span>
                <DeleteBtn onClick={() => deleteCategory(cat.id, cat.name)}>삭제</DeleteBtn>
              </Item>
            ))}
        </List>
      </Content>
    </PageWrap>
  );
}
