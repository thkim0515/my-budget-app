// Claude 소비 분석 — 보낼 집계 만들기, 비용 상한, 응답 해석. 호출 자체는 네이티브(BudgetPlugin.claudeMessages)가 한다.
import { byCategory, byMerchant, budgetSummary, daysInYm, monthSpend, parseYm, shiftYm, spendOf, toYm, txsOfMonth } from "./kakaoStats";

export const CLAUDE_MODEL = "claude-opus-5-5";
const MAX_TOKENS = 8000;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DEFAULT_LIMITS = { maxCalls: 30, maxUsd: 1 };

// 100만 토큰당 달러. 거절 시 다른 모델이 대신 답하면 응답의 model 로 계산하고, 모르는 모델은 Opus 값으로 잡는다.
const PRICES = {
  "claude-opus-5-5": [4, 20],
  "claude-opus-5": [5, 25],
  "claude-opus-4-8": [5, 25],
  "claude-sonnet-5-5": [2, 10],
};
const priceOf = (model) => PRICES[model] || PRICES[CLAUDE_MODEL];
const WORST_CASE_USD = (3000 * priceOf(CLAUDE_MODEL)[0] + MAX_TOKENS * priceOf(CLAUDE_MODEL)[1]) / 1e6;

// 보내는 값은 이 집계뿐이다. 개별 거래·시각·잔액·대출액·입금액·이체 상대 이름은 넣지 않는다(가맹점은 결제 건만).
export const buildAnalysisPayload = (txs, flow, ym, now = new Date()) => {
  const list = txsOfMonth(txs, ym);
  const total = monthSpend(txs, ym);
  const weekday = WEEKDAYS.map((name) => ({ 요일: name, 금액: 0 }));
  list.forEach((t) => { weekday[new Date(t.ts).getDay()].금액 += spendOf(t); });
  const isCurrent = ym === toYm(now);
  const payload = {
    대상월: ym,
    경과일수: isCurrent ? now.getDate() : daysInYm(ym),
    월일수: daysInYm(ym),
    결제합계: total,
    결제건수: list.filter((t) => t.kind === "payment").length,
    카테고리별: byCategory(list).map((r) => ({ 이름: r.name, 금액: r.amount, 건수: r.count })),
    가맹점상위10: byMerchant(list).slice(0, 10).map((r) => ({ 이름: r.name, 금액: r.amount, 건수: r.count })),
    요일별: weekday,
    직전3개월결제합계: [1, 2, 3].map((i) => ({ 월: shiftYm(ym, -i), 금액: monthSpend(txs, shiftYm(ym, -i)) })),
  };
  if (isCurrent) {
    const b = budgetSummary(txs, flow, now);
    if (b.hasBudget) payload.이번달예산 = { 예산: b.budget, 남은예산: b.remaining, 남은일수: b.daysLeft };
  }
  return payload;
};

const SYSTEM_PROMPT = `당신은 한국어로 답하는 개인 소비 분석가입니다. 사용자의 카카오뱅크 체크카드 결제 집계(JSON)를 보고 분석합니다.
집계에 있는 숫자만 근거로 삼고, 없는 사실을 지어내지 않습니다. 투자·대출 상품 추천은 하지 않습니다.
숫자를 함께 언급해 구체적으로, 존댓말로 간결하게 씁니다. 절약 제안은 실천할 수 있는 것만 최대 3개, 예상 절감액은 집계에서 합리적으로 추정한 월 금액(원)입니다. 추정이 어려우면 0으로 둡니다.`;

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "이번 달 소비 한두 문장 요약" },
    patterns: { type: "array", items: { type: "string" }, description: "눈에 띄는 소비 패턴" },
    savings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          detail: { type: "string" },
          monthlySaving: { type: "integer" },
        },
        required: ["title", "detail", "monthlySaving"],
        additionalProperties: false,
      },
    },
    warnings: { type: "array", items: { type: "string" }, description: "예산 초과 위험 등 주의할 점. 없으면 빈 배열" },
  },
  required: ["summary", "patterns", "savings", "warnings"],
  additionalProperties: false,
};

export const buildRequestBody = (payload) => JSON.stringify({
  model: CLAUDE_MODEL,
  max_tokens: MAX_TOKENS,
  fallbacks: "default",
  output_config: { effort: "medium", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
  system: SYSTEM_PROMPT,
  messages: [{ role: "user", content: JSON.stringify(payload) }],
});

// ---- 월별 호출 횟수·비용 ----
const USAGE_KEY = "kakaoClaudeUsage";
const LIMITS_KEY = "kakaoClaudeLimits";
const RESULT_PREFIX = "kakaoClaudeResult:";

const readJson = (key, fallback) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
};
const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* 저장 실패는 다음 호출에 영향이 없다 */
  }
};

export const getLimits = () => ({ ...DEFAULT_LIMITS, ...readJson(LIMITS_KEY, {}) });
export const saveLimits = (limits) => writeJson(LIMITS_KEY, limits);
export const getUsage = (now = new Date()) => {
  const usage = readJson(USAGE_KEY, {});
  return usage.ym === toYm(now) ? usage : { ym: toYm(now), calls: 0, usd: 0 };
};

// 한 번 더 호출해도 상한 안인지(최악의 비용으로 계산). 막히면 이유 문자열.
export const blockReason = (usage = getUsage(), limits = getLimits()) => {
  if (usage.calls >= limits.maxCalls) return `이번 달 호출 상한(${limits.maxCalls}회)에 도달했습니다.`;
  if (usage.usd + WORST_CASE_USD > limits.maxUsd) return `이번 달 비용 상한($${limits.maxUsd})에 가까워 호출하지 않았습니다.`;
  return null;
};

// 응답을 못 받아도 청구됐을 수 있어 호출 전에 최악의 비용을 잡아 두고, 결과가 오면 실제 값으로 바꾼다.
export const reserveCall = () => {
  const usage = getUsage();
  writeJson(USAGE_KEY, { ...usage, calls: usage.calls + 1, usd: usage.usd + WORST_CASE_USD });
};
export const settleCall = (actualUsd) => {
  const usage = getUsage();
  writeJson(USAGE_KEY, { ...usage, usd: Math.max(usage.usd - WORST_CASE_USD, 0) + actualUsd });
};

export const costOf = (model, usage = {}) => {
  const [input, output] = priceOf(model);
  return ((usage.input_tokens || 0) * input + (usage.output_tokens || 0) * output) / 1e6;
};

// 응답 본문 → { analysis, usd } 또는 { error, usd }
export const parseResponse = (status, bodyText) => {
  let body = null;
  try {
    body = JSON.parse(bodyText);
  } catch {
    /* 아래에서 처리 */
  }
  if (status === 401) return { error: "API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.", usd: 0 };
  if (status === 429) return { error: "요청이 많거나 API 사용 한도에 도달했습니다. 잠시 뒤 다시 시도해 주세요.", usd: 0 };
  if (status >= 400) return { error: `분석 요청이 실패했습니다(${status}). ${body?.error?.message || ""}`.trim(), usd: 0 };
  const usd = costOf(body?.model, body?.usage);
  if (body?.stop_reason === "refusal") return { error: "Claude가 이 요청에 답하지 않았습니다.", usd };
  if (body?.stop_reason === "max_tokens") return { error: "응답이 너무 길어 잘렸습니다. 다시 시도해 주세요.", usd };
  const text = (body?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  try {
    const analysis = JSON.parse(text);
    if (typeof analysis.summary !== "string") throw new Error("형식 오류");
    return { analysis, usd };
  } catch {
    return { error: "응답을 해석하지 못했습니다. 다시 시도해 주세요.", usd };
  }
};

export const loadResult = (ym) => readJson(RESULT_PREFIX + ym, null);
export const saveResult = (ym, analysis) => writeJson(RESULT_PREFIX + ym, { analysis, at: Date.now() });
export const monthLabel = (ym) => `${parseYm(ym).getFullYear()}년 ${parseYm(ym).getMonth() + 1}월`;
