// 금융사 체크를 바꾸는 즉시(시트를 닫기 전에) 전체 소비 화면이 달라지는지 확인한다. 저장소는 가짜로 바꾼다.
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getLightTheme } from "../../theme";
import SpendPage from "./SpendPage";

const mockNow = Date.now();
const mockData = {
  spendTx: [
    { id: "s1", kind: "payment", amount: 20000, ts: mockNow, merchant: "쿠팡", category: "쇼핑", sourceId: "samsung" },
    { id: "h1", kind: "payment", amount: 7000, ts: mockNow, merchant: "무신사", category: "쇼핑", sourceId: "hyundai" },
  ],
  kakaoTx: [{ id: "k1", kind: "payment", amount: 3000, ts: mockNow, merchant: "편의점", category: "편의점" }],
};
const mockPut = jest.fn();
const mockDelete = jest.fn();
const mockDb = { getAll: async () => [] };
const mockHelpers = { db: mockDb, getAll: async (store) => mockData[store] || [], add: jest.fn(), put: mockPut, deleteItem: mockDelete };

jest.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false }, registerPlugin: () => ({}) }));
jest.mock("../../plugins/BudgetPlugin", () => ({ BudgetPlugin: {} }));
jest.mock("react-router-dom", () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock("../../hooks/useBudgetDB", () => ({ useBudgetDB: () => mockHelpers }));
jest.mock("../../components/UI/Header", () => () => null);
jest.mock("../Kakao/KakaoCharts", () => ({
  won: (n) => `${n}원`,
  categoryColor: () => "#000",
  CategoryDoughnut: () => null,
  SpendBars: () => null,
}));

const hero = () => screen.getByText(/월에 사용한 금액$/).parentElement;
const check = (name) => fireEvent.click(screen.getByRole("checkbox", { name: new RegExp(name) }));

test("체크 해제·재체크가 시트를 닫지 않아도 합계·목록·안내에 바로 반영되고, 저장 내역은 건드리지 않음", async () => {
  localStorage.setItem("spendSources", JSON.stringify(["kakaobank", "samsung", "hyundai"]));
  render(<ThemeProvider theme={getLightTheme()}><SpendPage /></ThemeProvider>);
  await act(async () => {});
  expect(within(hero()).getByText("30000원")).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();

  fireEvent.click(screen.getByRole("tab", { name: "내역" }));
  fireEvent.change(screen.getByRole("combobox", { name: /출처/ }), { target: { value: "hyundai" } });
  expect(screen.getByText(/무신사/)).toBeTruthy();
  expect(screen.queryByText(/쿠팡/)).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: /＋ 편집/ }));
  check("현대카드");
  expect(within(hero()).getByText("23000원")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toBe("제외된 금융사 1곳 · 내역 1건");
  // 고른 출처가 사라져도 빈 목록이 되지 않는다.
  expect(screen.queryByText(/무신사/)).toBeNull();
  expect(screen.getByText(/쿠팡/)).toBeTruthy();

  check("현대카드");
  expect(within(hero()).getByText("30000원")).toBeTruthy();
  expect(screen.queryByRole("status")).toBeNull();
  expect(screen.getByText(/무신사/)).toBeTruthy();
  expect(screen.queryByText(/쿠팡/)).toBeNull(); // 출처 필터도 돌아온다

  expect(mockPut).not.toHaveBeenCalled();
  expect(mockDelete).not.toHaveBeenCalled();
});

const chip = (name) => screen.getByRole("button", { name });
const names = () => screen.getAllByRole("checkbox").map((c) => c.closest("label").textContent.replace(/추천|설치됨/g, ""));

test("칩: 수집 중인 금융사를 바로 보여 주고, 눌러 보기에서만 켜고 끔(수집 설정·데이터 유지), 길게 누르면 전체", async () => {
  localStorage.clear();
  localStorage.setItem("spendSources", JSON.stringify(["kakaobank", "samsung", "hyundai"]));
  render(<ThemeProvider theme={getLightTheme()}><SpendPage /></ThemeProvider>);
  await act(async () => {});
  expect(chip("현대카드").getAttribute("aria-pressed")).toBe("true");
  expect(within(hero()).getByText("30000원")).toBeTruthy();

  fireEvent.click(chip("현대카드"));
  expect(chip("현대카드").getAttribute("aria-pressed")).toBe("false"); // 흐리게+취소선 칩은 그대로 남음
  expect(within(hero()).getByText("23000원")).toBeTruthy();
  expect(JSON.parse(localStorage.getItem("spendSources"))).toEqual(["kakaobank", "samsung", "hyundai"]); // 수집은 그대로
  expect(mockPut).not.toHaveBeenCalled();

  fireEvent.click(chip("현대카드"));
  expect(within(hero()).getByText("30000원")).toBeTruthy();

  jest.useFakeTimers();
  fireEvent.pointerDown(chip("삼성카드"));
  act(() => { jest.advanceTimersByTime(650); });
  fireEvent.pointerUp(chip("삼성카드"));
  fireEvent.click(chip("삼성카드")); // 길게 누른 뒤의 클릭은 개별 토글이 아니다
  jest.useRealTimers();
  ["카카오뱅크", "삼성카드", "현대카드"].forEach((n) => expect(chip(n).getAttribute("aria-pressed")).toBe("false"));
  expect(within(hero()).getByText("0원")).toBeTruthy();
});

test("금융사 팝업: 체크한 곳이 위로, 해제하면 기본 순서로 돌아감, 가져오기는 하단 링크", async () => {
  localStorage.clear();
  localStorage.setItem("spendSources", JSON.stringify(["samsung"]));
  render(<ThemeProvider theme={getLightTheme()}><SpendPage /></ThemeProvider>);
  await act(async () => {});
  fireEvent.click(chip("＋ 편집"));
  expect(screen.getByRole("dialog", { name: "지출을 모을 금융사" })).toBeTruthy();
  expect(names().slice(0, 2)).toEqual(["삼성카드", "카카오뱅크"]); // 체크한 삼성카드가 추천인 카카오뱅크보다 위
  check("토스");
  expect(names().slice(0, 2)).toEqual(["삼성카드", "토스"]);
  check("토스");
  expect(names().indexOf("토스")).toBeGreaterThan(2); // 제자리로
  expect(screen.getByRole("button", { name: "거래내역 파일 가져오기" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "완료" })).toBeTruthy();
});
