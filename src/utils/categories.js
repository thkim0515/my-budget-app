// 카테고리 선택지의 단일 출처 — 기본(가계부·전체 소비)과 사용자가 만든 카테고리를 한 목록으로 합친다.
import { DEFAULT_CATEGORIES } from "../constants/categories";
import { SPEND_CATEGORIES } from "./spendParser";

const RECENT_KEY = "recentCategories";
const MAX_RECENT = 6;

export const BASE_CATEGORIES = [...new Set([
  ...SPEND_CATEGORIES.filter((c) => c !== "기타"),
  ...DEFAULT_CATEGORIES.filter((c) => c !== "기타"),
  "기타",
])];

// customRows: IndexedDB categories 행(이미 지운 것은 isDeleted). 반환: { base, custom, all }
export const mergeCategories = (customRows = [], extra = []) => {
  const custom = [...new Set(customRows.filter((r) => r && !r.isDeleted && r.name).map((r) => r.name.trim()))].filter((n) => n && !BASE_CATEGORIES.includes(n));
  // extra: 지금 값처럼 목록에 없지만 보여야 하는 이름(지운 카테고리를 쓰던 내역)
  const rest = extra.filter((n) => n && !BASE_CATEGORIES.includes(n) && !custom.includes(n));
  const userNames = [...custom, ...rest];
  return { base: BASE_CATEGORIES, custom: userNames, all: [...BASE_CATEGORIES.filter((c) => c !== "기타"), ...userNames, "기타"] };
};

// 이름 → 점 색. 기본 카테고리는 테마 지정색, 나머지는 이름으로 정한 팔레트 색(같은 이름은 항상 같은 색), 기타는 회색.
export const categoryDotColor = (name, theme) => {
  if (name === "기타") return theme.mutedText;
  if (theme.categoryColors?.[name]) return theme.categoryColors[name];
  const palette = theme.chartPalette || [theme.primary];
  let h = 0;
  for (const ch of name || "") h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length];
};

export const loadRecentCategories = () => {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};
export const pushRecentCategory = (name) => {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify([name, ...loadRecentCategories().filter((c) => c !== name)].slice(0, MAX_RECENT)));
  } catch {
    /* 기억하지 못해도 선택은 된다 */
  }
};

// 검색어에 맞는 이름만(대소문자·공백 무시)
export const filterCategories = (names, query) => {
  const q = (query || "").toLowerCase().replace(/\s+/g, "");
  return q ? names.filter((n) => n.toLowerCase().replace(/\s+/g, "").includes(q)) : names;
};
