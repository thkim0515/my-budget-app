import { adjustmentForRemaining, budgetSummary, byCategory, dailySeries, flowSeries, formatWhen, monthlySeries, netAt, splitNet, weeklySeries } from "./kakaoStats";
import { buildAnalysisPayload } from "./kakaoAnalysis";
import { blockReason, buildRequestBody, cheapestOf, enabledFrom, getEnabledModels, getModel, saveModel, setModelEnabled, costOf, parseModelList, parseResponse } from "./claudeClient";

const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).getTime();
const now = new Date(2026, 10, 10, 18); // 2026-11-10
const txs = [
  { kind: "payment", amount: 10000, ts: at(2026, 11, 1), category: "식비", merchant: "A" },
  { kind: "payment", amount: 5000, ts: at(2026, 11, 3), category: "교통", merchant: "B" },
  { kind: "refund", amount: 2000, ts: at(2026, 11, 3, 13), category: "교통", merchant: "B" },
  { kind: "income", amount: 100000, ts: at(2026, 11, 5), merchant: "급여" },
  { kind: "transfer", amount: 30000, ts: at(2026, 11, 6), merchant: "상대이름" },
  { kind: "income", amount: 500000, ts: at(2026, 11, 7), merchant: "대출", excludeFromFlow: true },
  { kind: "payment", amount: 7000, ts: at(2026, 10, 2), category: "식비", merchant: "A" },
];

test("일별: 누적·전월 누적·미래 끊김", () => {
  const rows = dailySeries(txs, "2026-11", now);
  expect(rows).toHaveLength(30);
  expect(rows[2]).toMatchObject({ spend: 3000, cum: 13000, prevCum: 7000 });
  expect(rows[9].cum).toBe(13000);
  expect(rows[10].cum).toBeNull();
});

test("주별·월별 합계", () => {
  const weeks = weeklySeries(txs, 3, now);
  expect(weeks[2].key).toBe("2026-11-09");
  expect(weeks[1].spend).toBe(3000); // 11/2 주
  expect(weeks[0].spend).toBe(10000); // 10/26 주
  const months = monthlySeries(txs, 2, now);
  expect(months.map((m) => m.spend)).toEqual([7000, 13000]);
});

test("카테고리: 취소 차감, 이체·입금 제외", () => {
  expect(byCategory(txs.filter((t) => t.ts >= at(2026, 11, 1)))).toEqual([
    { name: "식비", amount: 10000, count: 1 },
    { name: "교통", amount: 3000, count: 1 },
  ]);
});

describe("자금 흐름", () => {
  const flow = { anchorNet: -200000, anchorLoan: 0, anchorAt: at(2026, 11, 4), limit: 1000000 };
  test("기준 시점 전후 복원(대출 실행 제외)", () => {
    expect(netAt(txs, flow, at(2026, 11, 4))).toBe(-200000);
    expect(netAt(txs, flow, now.getTime())).toBe(-200000 + 100000 - 30000);
    expect(netAt(txs, flow, at(2026, 11, 1, 1))).toBe(-200000 + 10000 + 5000 - 2000);
  });
  test("일별 추이와 입출금", () => {
    const rows = flowSeries(txs, flow, 10, now);
    expect(rows).toHaveLength(10);
    expect(rows[9].net).toBe(-130000);
    expect(rows[4]).toMatchObject({ key: "2026-11-05", inflow: 100000, outflow: 0 });
  });
  test("입금은 마이너스 사용액부터 갚고 남는 금액만 잔액으로, 출금은 잔액부터", () => {
    const at0 = at(2026, 11, 1);
    const tx = (kind, amount, day) => ({ kind, amount, ts: at(2026, 11, day) });
    // 기준: 마이너스 사용액 300,000, 잔액 0
    const f = { anchorNet: -300000, anchorLoan: 0, anchorAt: at0, limit: 500000 };
    expect(splitNet([], f, now.getTime())).toEqual({ balance: 0, used: 300000, available: 200000 });
    expect(splitNet([tx("income", 100000, 2)], f, now.getTime())).toEqual({ balance: 0, used: 200000, available: 300000 });
    expect(splitNet([tx("income", 500000, 2)], f, now.getTime())).toEqual({ balance: 200000, used: 0, available: 700000 });
    // 잔액을 쓰고 0 아래로 가면 마이너스 사용액이 늘어남(결제 후 입금하면 다시 사용액부터 갚음)
    const flow2 = { anchorNet: 100000, anchorLoan: 0, anchorAt: at0, limit: 500000 };
    expect(splitNet([tx("payment", 30000, 2)], flow2, now.getTime())).toMatchObject({ balance: 70000, used: 0 });
    expect(splitNet([tx("payment", 130000, 2)], flow2, now.getTime())).toMatchObject({ balance: 0, used: 30000 });
    expect(splitNet([tx("payment", 130000, 2), tx("income", 50000, 3)], flow2, now.getTime())).toMatchObject({ balance: 20000, used: 0 });
    // 별도 대출(잔액과 함께 있는 사용액)도 입금으로 먼저 갚음
    const flow3 = { anchorNet: -200000, anchorLoan: 300000, anchorAt: at0, limit: 500000 };
    expect(splitNet([], flow3, now.getTime())).toEqual({ balance: 100000, used: 300000, available: 300000 });
    expect(splitNet([tx("income", 400000, 2)], flow3, now.getTime())).toMatchObject({ balance: 200000, used: 0 });
    // 순서대로 처리하고, 기준 이후·조회 시점 이전 거래만 반영
    expect(splitNet([tx("income", 50000, 3), tx("payment", 30000, 2)], flow3, at(2026, 11, 2, 18))).toMatchObject({ balance: 70000, used: 300000 });
    expect(splitNet([], {}, now.getTime())).toBeNull();
  });
});

test("예산: 남은 예산 직접 입력 보정과 하루 권장액", () => {
  const flow = { monthlyBudget: 300000 };
  const s = budgetSummary(txs, flow, now);
  expect(s).toMatchObject({ spent: 13000, remaining: 287000, daysLeft: 21, perDay: 13666 });
  const adjust = adjustmentForRemaining(txs, flow, 100000, now);
  const after = budgetSummary(txs, { ...flow, budgetAdjust: adjust, budgetAdjustYm: "2026-11" }, now);
  expect(after.remaining).toBe(100000);
  expect(budgetSummary(txs, { ...flow, budgetAdjust: adjust, budgetAdjustYm: "2026-10" }, now).remaining).toBe(287000);
  expect(budgetSummary(txs, {}, now).hasBudget).toBe(false);
});

describe("Claude 분석", () => {
  test("보내는 집계에 입금·이체 상대·잔액·거래 시각이 없다", () => {
    const flow = { monthlyBudget: 300000, anchorNet: -123456, anchorLoan: 0, anchorAt: 1, limit: 7777777 };
    const text = JSON.stringify(buildAnalysisPayload(txs, flow, "2026-11", now));
    expect(text).toContain("식비");
    ["상대이름", "급여", "123456", "7777777", "100000"].forEach((v) => expect(text).not.toContain(v));
  });
  test("상한", () => {
    expect(blockReason({ calls: 30, usd: 0 }, { maxCalls: 30, maxUsd: 1 })).toMatch("호출 상한");
    expect(blockReason({ calls: 1, usd: 0.95 }, { maxCalls: 30, maxUsd: 1 }, "claude-opus-5-5")).toMatch("비용 상한");
    expect(blockReason({ calls: 1, usd: 0.1 }, { maxCalls: 30, maxUsd: 1 }, "claude-opus-5-5")).toBeNull();
    expect(blockReason({ calls: 1, usd: 0.95 }, { maxCalls: 30, maxUsd: 1 }, "claude-haiku-5-5")).toBeNull();
  });
  test("비용 계산과 응답 해석", () => {
    expect(costOf("claude-opus-5-5", { input_tokens: 1000000, output_tokens: 1000000 })).toBe(24);
    expect(parseModelList(JSON.stringify({ data: [
      { id: "claude-sonnet-5-5", display_name: "Claude Sonnet 5.5", created_at: "2026-02", capabilities: { structured_outputs: { supported: true } } },
      { id: "claude-opus-4-1", display_name: "Old", created_at: "2025-01", capabilities: { structured_outputs: { supported: false } } },
      { id: "claude-instant", display_name: "x" },
      { id: "claude-haiku-5-5", lifecycle: "retired" },
    ] }))).toMatchObject({
      available: [{ id: "claude-sonnet-5-5", name: "Claude Sonnet 5.5" }],
      unavailable: [{ id: "claude-opus-4-1" }, { id: "claude-haiku-5-5", reason: "이 키로 쓸 수 없음" }, { id: "claude-opus-5-5" }],
    });
    expect(parseModelList("이상한 응답")).toBeNull();
    const ok = { model: "claude-opus-5-5", stop_reason: "end_turn", usage: { input_tokens: 1000, output_tokens: 1000 }, content: [{ type: "thinking", thinking: "" }, { type: "text", text: '{"summary":"요약","patterns":[],"savings":[],"warnings":[]}' }] };
    expect(parseResponse(200, JSON.stringify(ok))).toEqual({ analysis: { summary: "요약", patterns: [], savings: [], warnings: [] }, usd: 0.024, tokens: { input: 1000, output: 1000 }, model: "claude-opus-5-5" });
    expect(costOf("claude-haiku-5-5", { input_tokens: 1000000, output_tokens: 1000000 })).toBeCloseTo(0.6);
    expect(JSON.parse(buildRequestBody({}, "claude-haiku-5-5")).fallbacks).toBeUndefined();
    expect(JSON.parse(buildRequestBody({}, "claude-sonnet-5-5")).fallbacks).toBe("default");
    expect(parseResponse(401, "{}").error).toMatch("키");
    expect(parseResponse(200, JSON.stringify({ ...ok, stop_reason: "refusal" })).error).toBeTruthy();
  });
});

test("목록 날짜: 올해가 아니면 연도 표시", () => {
  const y = new Date().getFullYear();
  expect(formatWhen(new Date(y, 1, 14, 13, 48).getTime())).not.toMatch(/^\d{2}\./);
  expect(formatWhen(new Date(y - 1, 1, 14, 13, 48).getTime())).toMatch(new RegExp(`^${String(y - 1).slice(2)}\.`));
});

describe("사용할 모델 고르기", () => {
  const m = (id, line) => ({ id, name: id, line });
  const available = [m("claude-haiku-5-5", "haiku"), m("claude-sonnet-5-5", "sonnet"), m("claude-opus-5-5", "opus"), m("claude-fable-5-1", "fable"), m("claude-opus-5", "opus"), m("claude-sonnet-4-6", "sonnet")];
  beforeEach(() => localStorage.clear());
  test("기본은 계열별 최신 Haiku·Sonnet·Opus만", () => {
    expect(enabledFrom(available, null).map((x) => x.id)).toEqual(["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"]);
  });
  test("켠 것과 쓸 수 있는 것의 교집합, 사라진 모델만 남으면 기본으로", () => {
    expect(enabledFrom(available, ["claude-fable-5-1", "claude-gone"]).map((x) => x.id)).toEqual(["claude-fable-5-1"]);
    expect(enabledFrom(available, ["claude-gone"]).length).toBe(3);
  });
  test("가장 저렴한 모델", () => {
    expect(cheapestOf(available).id).toBe("claude-haiku-5-5");
    expect(cheapestOf([m("claude-opus-5-5", "opus"), m("claude-sonnet-5-5", "sonnet")]).id).toBe("claude-sonnet-5-5");
  });
  test("꺼진 모델은 저장돼 있어도 쓰지 않고 가장 저렴한 켜진 모델로, 마지막 하나는 못 끔", () => {
    localStorage.setItem("claudeModelState", JSON.stringify({ available, unavailable: [], source: "api" }));
    saveModel("claude-sonnet-5-5");
    expect(getModel()).toBe("claude-sonnet-5-5");
    expect(setModelEnabled("claude-sonnet-5-5", false)).toBe(true);
    expect(getModel()).toBe("claude-haiku-5-5");
    expect(setModelEnabled("claude-opus-5-5", false)).toBe(true);
    expect(getEnabledModels().map((x) => x.id)).toEqual(["claude-haiku-5-5"]);
    expect(setModelEnabled("claude-haiku-5-5", false)).toBe(false); // 마지막 하나
    saveModel("claude-opus-5-5");
    expect(getModel()).toBe("claude-haiku-5-5"); // 켠 모델이 하나면 선택 없이 그것
  });
});
