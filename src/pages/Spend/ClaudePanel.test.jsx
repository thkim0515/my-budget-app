// 실제 Claude 를 부르지 않는다 — 네이티브 호출을 가짜 응답으로 바꿔 화면·토큰·장부·상한을 확인한다.
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { getLightTheme } from "../../theme";
import { BudgetPlugin } from "../../plugins/BudgetPlugin";
import { saveLimits, saveModel, getUsage } from "../../utils/claudeClient";
import { monthPeriod } from "../../utils/spendStats";
import ClaudePanel from "./ClaudePanel";

jest.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => true }, registerPlugin: () => ({}) }));
jest.mock("../../plugins/BudgetPlugin", () => ({
  BudgetPlugin: { hasClaudeApiKey: jest.fn(), claudeMessages: jest.fn(), saveClaudeApiKey: jest.fn(), deleteClaudeApiKey: jest.fn() },
}));
jest.mock("../Kakao/KakaoCharts", () => ({ won: (n) => `${n}원` }));

const ym = "2026-10";
const txs = [{ id: "1", kind: "payment", amount: 10000, ts: new Date(2026, 9, 5, 12).getTime(), merchant: "스타벅스", category: "식비", sourceId: "samsung" }];
const fake = (over = {}) => ({
  status: 200,
  body: JSON.stringify({
    model: "claude-sonnet-5-5", stop_reason: "end_turn", usage: { input_tokens: 1200, output_tokens: 800 },
    content: [{ type: "text", text: JSON.stringify({ summary: "가짜 요약입니다", patterns: ["패턴"], savings: [{ title: "절약", detail: "내용", monthlySaving: 5000 }], warnings: [] }) }],
    ...over,
  }),
});
const show = () => render(<ThemeProvider theme={getLightTheme()}><ClaudePanel txs={txs} period={monthPeriod(ym)} /></ThemeProvider>);

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  BudgetPlugin.hasClaudeApiKey.mockResolvedValue({ exists: true });
});

test("가짜 응답: 결과·토큰·비용 표시, 장부 누적, 집계만 전송, 기간별 저장", async () => {
  BudgetPlugin.claudeMessages.mockResolvedValue(fake());
  show();
  fireEvent.click(await screen.findByRole("button", { name: /분석하기/ }));
  await screen.findByText("가짜 요약입니다");
  // 1200×$2 + 800×$10 (100만 토큰당) = $0.0104
  expect(screen.getAllByText(/입력 1200 · 출력 800 토큰 · 약 \$0\.01/)).toHaveLength(2); // 이번 호출 + 월 누적
  const usage = getUsage();
  expect(usage).toMatchObject({ calls: 1, input: 1200, output: 800 });
  expect(usage.usd).toBeCloseTo(0.0104, 5);

  const call = BudgetPlugin.claudeMessages.mock.calls[0][0];
  expect(call.fallback).toBe(true);
  const sent = JSON.parse(call.body);
  expect(sent.model).toBe("claude-sonnet-5-5");
  expect(sent.messages[0].content).toContain("스타벅스");
  expect(sent.messages[0].content).not.toContain(String(txs[0].ts));
  expect(JSON.parse(localStorage.getItem("spendClaudeResults"))[0].key).toBe(ym);
});

test("Haiku 선택 시 대체 모델 없이 호출", async () => {
  saveModel("claude-haiku-5-5");
  BudgetPlugin.claudeMessages.mockResolvedValue(fake({ model: "claude-haiku-5-5" }));
  show();
  fireEvent.click(await screen.findByRole("button", { name: /분석하기/ }));
  await screen.findByText("가짜 요약입니다");
  const call = BudgetPlugin.claudeMessages.mock.calls[0][0];
  expect(call.fallback).toBe(false);
  expect(JSON.parse(call.body).fallbacks).toBeUndefined();
});

test("상한에 걸리면 호출하지 않음", async () => {
  saveLimits({ maxCalls: 0, maxUsd: 1 });
  show();
  fireEvent.click(await screen.findByRole("button", { name: /분석하기/ }));
  await screen.findByText(/호출 상한/);
  expect(BudgetPlugin.claudeMessages).not.toHaveBeenCalled();
});

test("오류 응답·네트워크 오류 처리", async () => {
  BudgetPlugin.claudeMessages.mockResolvedValueOnce({ status: 401, body: "{}" });
  show();
  fireEvent.click(await screen.findByRole("button", { name: /분석하기/ }));
  await screen.findByText(/API 키가 올바르지/);
  expect(getUsage().usd).toBe(0); // 청구되지 않은 응답은 잡아 둔 비용을 되돌린다

  BudgetPlugin.claudeMessages.mockRejectedValueOnce(new Error("NETWORK"));
  fireEvent.click(screen.getByRole("button", { name: /분석하기/ }));
  await screen.findByText(/네트워크 오류/);
  await waitFor(() => expect(getUsage().usd).toBeGreaterThan(0)); // 청구 여부를 몰라 잡아 둔 채로 둔다
});
