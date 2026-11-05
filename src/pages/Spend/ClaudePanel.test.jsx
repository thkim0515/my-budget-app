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
  BudgetPlugin: { hasClaudeApiKey: jest.fn(), claudeMessages: jest.fn(), claudeListModels: jest.fn(), saveClaudeApiKey: jest.fn(), deleteClaudeApiKey: jest.fn() },
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
  expect(sent.messages[0].content).toContain("지출목록"); // 기본은 상세 분석
  expect(sent.messages[0].content).toContain("2026-10-05 12:00");
  expect(JSON.parse(localStorage.getItem("spendClaudeResults"))[0].key).toBe(ym);
});

test("금융사별 코멘트를 요청하고 결과에 표시", async () => {
  const body = JSON.parse(fake().body);
  body.content[0].text = JSON.stringify({ ...JSON.parse(body.content[0].text), sourceComments: [{ source: "삼성카드", comment: "식비 비중이 100%입니다" }] });
  BudgetPlugin.claudeMessages.mockResolvedValue({ status: 200, body: JSON.stringify(body) });
  show();
  fireEvent.click(await screen.findByRole("button", { name: /분석하기/ }));
  await screen.findByText("식비 비중이 100%입니다");
  const sent = JSON.parse(BudgetPlugin.claudeMessages.mock.calls[0][0].body);
  expect(sent.output_config.format.schema.required).toContain("sourceComments");
  expect(sent.system).toContain("sourceComments");
});

test("금융사 선택으로 내역이 바뀌면 저장된 분석에 안내를 표시하고, 다음 분석은 넘어온 내역만 보냄", async () => {
  BudgetPlugin.claudeMessages.mockResolvedValue(fake());
  const period = monthPeriod(ym);
  const ui = (list) => <ThemeProvider theme={getLightTheme()}><ClaudePanel txs={list} period={period} /></ThemeProvider>;
  const hyundai = { id: "2", kind: "payment", amount: 7000, ts: new Date(2026, 9, 6, 12).getTime(), merchant: "제외가맹점", category: "쇼핑", sourceId: "hyundai" };
  const { rerender } = render(ui([...txs, hyundai]));
  fireEvent.click(await screen.findByRole("button", { name: /분석하기/ }));
  await screen.findByText("가짜 요약입니다");
  expect(screen.queryByText(/다시 분석하면 반영됩니다/)).toBeNull();

  rerender(ui(txs));
  expect(screen.getByText(/다시 분석하면 반영됩니다/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /다시 분석하기/ }));
  await waitFor(() => expect(BudgetPlugin.claudeMessages).toHaveBeenCalledTimes(2));
  expect(BudgetPlugin.claudeMessages.mock.calls[1][0].body).not.toContain("제외가맹점");
  await waitFor(() => expect(screen.queryByText(/다시 분석하면 반영됩니다/)).toBeNull());
});

test("요약 분석을 고르면 한 건씩의 내역을 보내지 않고, 미리보기에 건수·토큰이 보임", async () => {
  BudgetPlugin.claudeMessages.mockResolvedValue(fake());
  show();
  fireEvent.click(await screen.findByRole("button", { name: "요약 분석" }));
  expect(screen.getByText(/지출 1건 · 입력 약 \d+ 토큰 · 예상/)).toBeTruthy();
  fireEvent.click(await screen.findByRole("button", { name: /분석하기/ }));
  await screen.findByText("가짜 요약입니다");
  expect(BudgetPlugin.claudeMessages.mock.calls[0][0].body).not.toContain("지출목록");
});

test("모델 목록: 쓸 수 있는 것만 펼치고 사용 불가는 접힘, 목록 실패 시 기본 목록", async () => {
  BudgetPlugin.claudeListModels.mockResolvedValueOnce({ status: 200, body: JSON.stringify({ data: [{ id: "claude-haiku-5-5", display_name: "Claude Haiku 5.5" }] }) });
  show();
  fireEvent.click(await screen.findByRole("button", { name: "키·모델·상한" }));
  await screen.findByText("사용 불가 모델 2개");
  expect(screen.getByText(/선택 없이/).textContent).toContain("Haiku 5.5"); // 켜진 모델이 하나면 선택지 없이 사용
  expect(screen.queryByText("Opus 5.5")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: /사용 불가 모델/ }));
  expect(screen.getByText("Opus 5.5")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: /사용 불가 모델/ }));
  expect(screen.queryByText("Opus 5.5")).toBeNull();
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
