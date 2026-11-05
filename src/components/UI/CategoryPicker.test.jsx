import { act, fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getLightTheme } from "../../theme";
import CategoryField from "./CategoryPicker";
import { RulesSheet } from "../../pages/Spend/SpendSheets";
import { categoryDotColor, filterCategories, loadRecentCategories, mergeCategories, pushRecentCategory } from "../../utils/categories";
import { buildKnown, normalizeMerchant } from "../../utils/spendClassify";
import { forgetMerchantCategory, loadMerchantRuleList, rememberMerchantCategory } from "../../utils/kakaoIngest";

const mockAdd = jest.fn(async () => "new");
const mockRows = [{ id: "c1", name: "스터디카페" }, { id: "c2", name: "옛날것", isDeleted: true }, { id: "c3", name: "식비" }];
jest.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false }, registerPlugin: () => ({}) }));
jest.mock("../../plugins/BudgetPlugin", () => ({ BudgetPlugin: {} }));
const mockDbApi = { db: {}, getAll: async () => mockRows.filter((r) => !r.isDeleted), add: mockAdd, put: jest.fn() }; // 실제 훅처럼 참조가 안정적이어야 한다
jest.mock("../../hooks/useBudgetDB", () => ({ useBudgetDB: () => mockDbApi }));

const wrap = (ui) => render(<ThemeProvider theme={getLightTheme()}>{ui}</ThemeProvider>);
beforeEach(() => { localStorage.clear(); jest.clearAllMocks(); });

describe("카테고리 목록(단일 출처)", () => {
  test("기본 + 사용자 카테고리, 중복·삭제분 제외, 기타는 맨 뒤", () => {
    const m = mergeCategories(mockRows);
    expect(m.custom).toEqual(["스터디카페"]);
    expect(m.all).toContain("편의점"); // 전체 소비 기본
    expect(m.all).toContain("문화"); // 가계부 기본
    expect(m.all.filter((c) => c === "식비")).toHaveLength(1);
    expect(m.all[m.all.length - 1]).toBe("기타");
    expect(mergeCategories([], ["지운것"]).all).toContain("지운것"); // 지금 값은 목록에 없어도 보임
  });
  test("색은 같은 이름이면 항상 같고 기타는 회색, 검색·최근", () => {
    const t = getLightTheme();
    expect(categoryDotColor("스터디카페", t)).toBe(categoryDotColor("스터디카페", t));
    expect(categoryDotColor("기타", t)).toBe(t.mutedText);
    expect(filterCategories(["스터디 카페", "식비"], "스터디카")).toEqual(["스터디 카페"]);
    pushRecentCategory("식비"); pushRecentCategory("교통"); pushRecentCategory("식비");
    expect(loadRecentCategories()).toEqual(["식비", "교통"]);
  });
});

describe("카테고리 선택 시트", () => {
  test("내가 만든 카테고리가 '내'로 보이고 고르면 바로 적용·최근에 기록", async () => {
    const onChange = jest.fn();
    wrap(<CategoryField label="카테고리" value="기타" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /카테고리: 기타/ }));
    await act(async () => {});
    expect(screen.getByText("내 카테고리")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /스터디카페/ }));
    expect(onChange).toHaveBeenCalledWith("스터디카페");
    expect(loadRecentCategories()[0]).toBe("스터디카페");
  });
  test("검색 후 새 카테고리로 바로 추가", async () => {
    const onChange = jest.fn();
    wrap(<CategoryField value="기타" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /카테고리: 기타/ }));
    await act(async () => {});
    fireEvent.change(screen.getByLabelText("카테고리 검색"), { target: { value: "반려동물" } });
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: /‘반려동물’ 새 카테고리로 추가/ })); });
    expect(mockAdd).toHaveBeenCalledWith("categories", expect.objectContaining({ name: "반려동물" }));
    expect(onChange).toHaveBeenCalledWith("반려동물");
  });
});

describe("최근 분류 변경 규칙", () => {
  test("최근 순 목록, 지우면 자동 분류에서도 빠짐, 다시 정하면 복귀", () => {
    rememberMerchantCategory("A마트", "식비");
    rememberMerchantCategory("스타벅스 강남점", "식비");
    rememberMerchantCategory("A마트", "생활"); // 다시 정하면 맨 위
    expect(loadMerchantRuleList().map((r) => r.merchant)).toEqual(["A마트", "스타벅스 강남점"]);
    expect(buildKnown([]).some(([n]) => n === normalizeMerchant("스타벅스 강남점"))).toBe(true);
    forgetMerchantCategory("스타벅스 강남점");
    expect(loadMerchantRuleList().map((r) => r.merchant)).toEqual(["A마트"]);
    expect(buildKnown([{ kind: "payment", merchant: "스타벅스 역삼점", category: "식비" }]).some(([n]) => n === "스타벅스")).toBe(false);
    rememberMerchantCategory("스타벅스 강남점", "식비");
    expect(buildKnown([]).some(([n]) => n === "스타벅스")).toBe(true);
  });
  test("행에서 카테고리를 바꾸면 규칙 갱신 + 같은 이름 내역 일괄 변경 + 되돌리기", async () => {
    rememberMerchantCategory("A마트", "식비");
    const data = [{ id: 1, kind: "payment", merchant: "A마트", category: "식비" }, { id: 2, kind: "payment", merchant: "A마트", category: "식비" }, { id: 3, kind: "payment", merchant: "B", category: "식비" }];
    const helpers = { getAll: async (s) => (s === "spendTx" ? data : []), put: async (_s, t) => { data.splice(data.findIndex((x) => x.id === t.id), 1, t); } };
    const onBulk = jest.fn();
    wrap(<RulesSheet txs={data} helpers={helpers} onBulk={onBulk} onClose={() => {}} />);
    await act(async () => {});
    expect(screen.getByText(/내역 2건/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /카테고리: 식비/ }));
    await act(async () => {});
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "스터디카페 내" })); });
    expect(data.map((t) => t.category)).toEqual(["스터디카페", "스터디카페", "식비"]);
    expect(loadMerchantRuleList()[0]).toMatchObject({ merchant: "A마트", category: "스터디카페" });
    expect(onBulk.mock.calls[0][0].message).toContain("같은 이름 2건도 변경");
    await act(async () => { await onBulk.mock.calls[0][0].undo(); });
    expect(data.map((t) => t.category)).toEqual(["식비", "식비", "식비"]);
    expect(loadMerchantRuleList()[0].category).toBe("식비");
  });
});
