import { useCallback, useEffect, useMemo, useState } from "react";
import styled, { useTheme } from "styled-components";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { categoryDotColor, filterCategories, loadRecentCategories, mergeCategories, pushRecentCategory } from "../../utils/categories";
import Sheet from "./Sheet";

// 기본 + 사용자가 만든 카테고리를 한 목록으로 읽는다(IndexedDB categories). extra: 목록에 없어도 보여야 할 이름.
export function useCategoryList(extra = []) {
  const { db, getAll, add, put } = useBudgetDB();
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => { if (db) setRows(await getAll("categories")); }, [db, getAll]);
  useEffect(() => {
    load();
    window.addEventListener("budget-db-updated", load);
    return () => window.removeEventListener("budget-db-updated", load);
  }, [load]);
  const merged = useMemo(() => mergeCategories(rows, extra), [rows, extra]); // eslint-disable-line react-hooks/exhaustive-deps
  const addCategory = async (raw) => {
    const name = raw.trim();
    if (!name || merged.all.includes(name)) return name;
    await add("categories", { id: `cat_${Date.now()}`, name, createdAt: new Date(), isDeleted: false });
    window.dispatchEvent(new CustomEvent("budget-db-updated"));
    return name;
  };
  return { ...merged, addCategory, put };
}

const Trigger = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: ${({ $compact }) => ($compact ? "44px" : "46px")};
  margin-top: ${({ $compact }) => ($compact ? 0 : "5px")};
  padding: 0 12px;
  box-sizing: border-box;
  border: 1.5px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.cardAlt};
  color: ${({ theme }) => theme.text};
  font-size: ${({ $compact }) => ($compact ? "15px" : "16px")};
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  & > span:nth-child(2) { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.primary}; outline-offset: 2px; }
`;
const Dot = styled.span`
  flex-shrink: 0;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
`;
const Label = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.subText};
  margin-bottom: 12px;
`;
const Group = styled.div`
  margin-top: 16px;
  & > h4 { margin: 0 0 8px; font-size: 12.5px; font-weight: 700; color: ${({ theme }) => theme.subText}; }
`;
const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;
const Chip = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  max-width: 100%;
  padding: 0 14px;
  box-sizing: border-box;
  border: 1.5px solid ${({ $active, theme }) => ($active ? theme.primary : theme.border)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $active, $add, theme }) => ($active ? theme.primarySoft : $add ? "transparent" : theme.cardAlt)};
  color: ${({ $active, $add, theme }) => ($active || $add ? theme.primaryText : theme.text)};
  font-size: 14.5px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
  transition: background 0.12s, border-color 0.12s;
  &:active { background: ${({ theme }) => theme.primarySoft}; }
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.primary}; outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;
const Mine = styled.small`
  padding: 1px 6px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.primarySoft};
  color: ${({ theme }) => theme.primaryText};
  font-size: 11px;
  font-weight: 700;
`;
const Search = styled.input`
  display: block;
  width: 100%;
  min-height: 46px;
  padding: 0 12px;
  box-sizing: border-box;
  border: 1.5px solid ${({ theme }) => theme.border};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.cardAlt};
  color: ${({ theme }) => theme.text};
  font-size: 16px;
`;

// 이름 칩 그리드 바텀시트. 최근 쓴 것이 맨 위, 내가 만든 것은 따로 묶고 "내" 표시, 새 카테고리는 바로 추가한다.
export function CategorySheet({ value, onPick, onClose, title = "카테고리 고르기" }) {
  const theme = useTheme();
  const { base, custom, all, addCategory } = useCategoryList(value ? [value] : []);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const recent = useMemo(() => loadRecentCategories().filter((c) => all.includes(c)).slice(0, 5), [all]);
  const matches = filterCategories(all, query);
  const q = query.trim();
  const canAdd = q.length > 0 && !all.includes(q);

  const pick = async (name) => {
    pushRecentCategory(name);
    onPick(name);
    onClose();
  };
  const chip = (name) => (
    <Chip key={name} type="button" $active={name === value} aria-pressed={name === value} onClick={() => pick(name)}>
      <Dot $color={categoryDotColor(name, theme)} />
      <span>{name}</span>
      {custom.includes(name) && <Mine>내</Mine>}
    </Chip>
  );
  const section = (heading, names) => names.length > 0 && <Group><h4>{heading}</h4><Chips>{names.map(chip)}</Chips></Group>;

  return (
    <Sheet title={title} onClose={onClose}>
      <Search type="search" placeholder="카테고리 검색 · 없으면 바로 추가" value={query} aria-label="카테고리 검색" onChange={(e) => setQuery(e.target.value)} />
      {!query && section("최근 쓴 카테고리", recent)}
      {section("기본", matches.filter((n) => base.includes(n)))}
      {section("내 카테고리", matches.filter((n) => custom.includes(n)))}
      {matches.length === 0 && !canAdd && <Label style={{ marginTop: 16 }}>맞는 카테고리가 없습니다.</Label>}
      <Group>
        <Chips>
          {canAdd && <Chip type="button" $add onClick={async () => pick(await addCategory(q))}>＋ ‘{q}’ 새 카테고리로 추가</Chip>}
          <Chip type="button" $add aria-expanded={adding} onClick={() => setAdding(!adding)}>＋ 새 카테고리</Chip>
        </Chips>
        {adding && (
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <Search value={newName} maxLength={12} placeholder="새 카테고리 이름" aria-label="새 카테고리 이름" onChange={(e) => setNewName(e.target.value)} />
            <Chip type="button" $active style={{ flexShrink: 0, whiteSpace: "nowrap" }} disabled={!newName.trim() || all.includes(newName.trim())} onClick={async () => pick(await addCategory(newName))}>추가</Chip>
          </div>
        )}
        {adding && all.includes(newName.trim()) && <Label style={{ marginTop: 6, marginBottom: 0 }}>이미 있는 카테고리입니다.</Label>}
      </Group>
    </Sheet>
  );
}

// 폼에서 쓰는 선택 칸. 누르면 CategorySheet 가 열린다.
export default function CategoryField({ value, onChange, label, compact = false }) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const trigger = (
    <Trigger type="button" $compact={compact} aria-haspopup="dialog" aria-label={`${label || "카테고리"}: ${value}. 눌러서 변경`} onClick={() => setOpen(true)}>
      <Dot $color={categoryDotColor(value, theme)} />
      <span>{value}</span>
      <span aria-hidden="true" style={{ color: theme.subText }}>▾</span>
    </Trigger>
  );
  return (
    <>
      {label ? <Label as="div" style={{ marginBottom: 12 }}>{label}{trigger}</Label> : trigger}
      {open && <CategorySheet value={value} onPick={onChange} onClose={() => setOpen(false)} />}
    </>
  );
}
