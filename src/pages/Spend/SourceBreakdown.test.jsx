import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getDarkTheme } from "../../theme";
import { monthPeriod, sourceBreakdown } from "../../utils/spendStats";
import SourceBreakdown from "./SourceBreakdown";

jest.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false }, registerPlugin: () => ({}) }));
jest.mock("../Kakao/KakaoCharts", () => ({ won: (n) => `${n}원`, categoryColor: () => "#000", SpendBars: ({ rows }) => <div>추이 합계 {rows.reduce((a, r) => a + r.spend, 0)}</div> }));

const ts = new Date(2026, 9, 5, 12).getTime();
const list = [
  { id: "1", kind: "payment", amount: 30000, ts, merchant: "쿠팡", category: "쇼핑", sourceId: "samsung" },
  { id: "2", kind: "payment", amount: 10000, ts, merchant: "스타벅스", category: "식비", sourceId: "kakaobank" },
];
function View() {
  const [active, setActive] = useState(null);
  return <ThemeProvider theme={getDarkTheme()}><SourceBreakdown rows={sourceBreakdown(list, ["samsung", "shinhan"])} list={list} period={monthPeriod("2026-10")} activeId={active} onPick={setActive} /></ThemeProvider>;
}

test("금융사를 누르면 그곳만 펼치고, 다시 누르면 닫으며, 0원인 곳은 누를 수 없음", () => {
  render(<View />);
  expect(screen.queryByText("일별 추이")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /삼성카드 · 1건 · 75%/ }));
  expect(screen.getByText("추이 합계 30000")).toBeTruthy();
  expect(screen.getByText(/쿠팡 · 1건/)).toBeTruthy();
  expect(screen.queryByText(/스타벅스/)).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /삼성카드 · 1건/ }));
  expect(screen.queryByText("일별 추이")).toBeNull();
  expect(screen.getByRole("button", { name: /신한카드 · 0건/ }).disabled).toBe(true);
});
