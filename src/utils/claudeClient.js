// Claude 호출 공용 모듈 — 모델 선택, 단가, 월 토큰·비용 장부, 상한, 응답 해석.
// 키 저장과 실제 HTTP 는 네이티브(BudgetPlugin)가 맡아 키가 웹뷰로 나오지 않는다. 벨라의 모델·단가·장부 방식을 따랐다.
import { BudgetPlugin } from "../plugins/BudgetPlugin";
import { toYm } from "./kakaoStats";

const MAX_TOKENS = 8000;

// fallback: 거절 시 서버 대체 모델 사용 가능 여부(Haiku 는 지원하지 않아 보내지 않는다).
export const CLAUDE_MODELS = [
  { id: "claude-haiku-5-5", name: "Haiku 5.5", desc: "가장 저렴하고 빠름", fallback: false },
  { id: "claude-sonnet-5-5", name: "Sonnet 5.5", desc: "균형(기본)", fallback: true },
  { id: "claude-opus-5-5", name: "Opus 5.5", desc: "가장 깊은 분석, 비쌈", fallback: true },
];
const DEFAULT_MODEL = "claude-sonnet-5-5";
const DEFAULT_LIMITS = { maxCalls: 30, maxUsd: 1 };

// 모델 ID 앞부분 → [입력, 출력, 캐시 쓰기, 캐시 읽기] (달러/100만 토큰). 대체 모델로 답이 올 수 있어 함께 둔다.
const PRICES = [
  ["claude-fable-5", 10, 50, 12.5, 1],
  ["claude-opus-5-5", 4, 20, 5, 0.2],
  ["claude-opus-5", 5, 25, 6.25, 0.5],
  ["claude-opus-4", 5, 25, 6.25, 0.5],
  ["claude-sonnet-5", 2, 10, 2.5, 0.2],
  ["claude-haiku-5-5", 0.1, 0.5, 0.125, 0.01],
];
const priceOf = (model) => (PRICES.find(([prefix]) => (model || "").startsWith(prefix)) || PRICES[1]).slice(1);

export const modelName = (id) => CLAUDE_MODELS.find((m) => m.id === id)?.name || id || "";

const MODEL_KEY = "claudeModel";
const LIMITS_KEY = "claudeLimits";
const USAGE_KEY = "claudeUsage";

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
    /* 저장 실패는 분석 자체에 영향이 없다 */
  }
};

export const getModel = () => {
  try {
    const id = localStorage.getItem(MODEL_KEY);
    return CLAUDE_MODELS.some((m) => m.id === id) ? id : DEFAULT_MODEL;
  } catch {
    return DEFAULT_MODEL;
  }
};
export const saveModel = (id) => {
  try {
    localStorage.setItem(MODEL_KEY, id);
  } catch {
    /* 다음 호출은 기본 모델로 간다 */
  }
};

// v1.2.0 카카오뱅크 탭의 상한·사용량을 이어받는다.
export const getLimits = () => ({ ...DEFAULT_LIMITS, ...readJson("kakaoClaudeLimits", {}), ...readJson(LIMITS_KEY, {}) });
export const saveLimits = (limits) => writeJson(LIMITS_KEY, limits);
export const getUsage = (now = new Date()) => {
  const usage = readJson(USAGE_KEY, null) || readJson("kakaoClaudeUsage", {});
  const empty = { ym: toYm(now), calls: 0, usd: 0, input: 0, output: 0 };
  return usage.ym === toYm(now) ? { ...empty, ...usage } : empty;
};

// 이번 호출의 최악 비용. 입력은 글자 수로 넉넉히 잡고(한글은 글자당 토큰이 많다) 출력은 max_tokens 전부로 본다.
export const worstCaseUsd = (model, bodyLength = 6000) => {
  const [input, output] = priceOf(model);
  return (bodyLength * input + MAX_TOKENS * output) / 1e6;
};

export const blockReason = (usage = getUsage(), limits = getLimits(), model = getModel(), bodyLength) => {
  if (usage.calls >= limits.maxCalls) return `이번 달 호출 상한(${limits.maxCalls}회)에 도달했습니다.`;
  if (usage.usd + worstCaseUsd(model, bodyLength) > limits.maxUsd) return `이번 달 비용 상한($${limits.maxUsd})에 가까워 호출하지 않았습니다.`;
  return null;
};

export const costOf = (model, usage = {}) => {
  const [input, output, cacheWrite, cacheRead] = priceOf(model);
  return ((usage.input_tokens || 0) * input + (usage.output_tokens || 0) * output
    + (usage.cache_creation_input_tokens || 0) * cacheWrite + (usage.cache_read_input_tokens || 0) * cacheRead) / 1e6;
};

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string", description: "소비 한두 문장 요약" },
    patterns: { type: "array", items: { type: "string" }, description: "눈에 띄는 소비 패턴" },
    savings: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, detail: { type: "string" }, monthlySaving: { type: "integer" } },
        required: ["title", "detail", "monthlySaving"],
        additionalProperties: false,
      },
    },
    warnings: { type: "array", items: { type: "string" }, description: "예산 초과 위험 등 주의할 점. 없으면 빈 배열" },
  },
  required: ["summary", "patterns", "savings", "warnings"],
  additionalProperties: false,
};

export const SYSTEM_PROMPT = `당신은 한국어로 답하는 개인 소비 분석가입니다. 사용자의 결제 집계(JSON)를 보고 분석합니다.
집계에 있는 숫자만 근거로 삼고, 없는 사실을 지어내지 않습니다. 투자·대출 상품 추천은 하지 않습니다.
숫자를 함께 언급해 구체적으로, 존댓말로 간결하게 씁니다. 절약 제안은 실천할 수 있는 것만 최대 3개, 예상 절감액은 집계에서 합리적으로 추정한 월 금액(원)입니다. 추정이 어려우면 0으로 둡니다.`;

export const buildRequestBody = (payload, model = getModel()) => {
  const body = {
    model,
    max_tokens: MAX_TOKENS,
    output_config: { effort: "medium", format: { type: "json_schema", schema: OUTPUT_SCHEMA } },
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: JSON.stringify(payload) }],
  };
  if (CLAUDE_MODELS.find((m) => m.id === model)?.fallback) body.fallbacks = "default";
  return JSON.stringify(body);
};

// 응답 본문 → { analysis, usd, tokens, model } 또는 { error, usd, tokens, model }
export const parseResponse = (status, bodyText) => {
  let body = null;
  try {
    body = JSON.parse(bodyText);
  } catch {
    /* 아래에서 처리 */
  }
  const tokens = { input: 0, output: 0 };
  if (status === 401) return { error: "API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.", usd: 0, tokens };
  if (status === 429) return { error: "요청이 많거나 API 사용 한도에 도달했습니다. 잠시 뒤 다시 시도해 주세요.", usd: 0, tokens };
  if (status >= 400) return { error: `분석 요청이 실패했습니다(${status}). ${body?.error?.message || ""}`.trim(), usd: 0, tokens };
  const usage = body?.usage || {};
  tokens.input = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
  tokens.output = usage.output_tokens || 0;
  const base = { usd: costOf(body?.model, usage), tokens, model: body?.model };
  if (body?.stop_reason === "refusal") return { ...base, error: "Claude가 이 요청에 답하지 않았습니다." };
  if (body?.stop_reason === "max_tokens") return { ...base, error: "응답이 너무 길어 잘렸습니다. 다시 시도해 주세요." };
  const text = (body?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  try {
    const analysis = JSON.parse(text);
    if (typeof analysis.summary !== "string") throw new Error("형식 오류");
    return { ...base, analysis };
  } catch {
    return { ...base, error: "응답을 해석하지 못했습니다. 다시 시도해 주세요." };
  }
};

// 분석 한 번 실행. 응답을 못 받아도 청구됐을 수 있어 최악의 비용을 잡아 두고, 결과가 오면 실제 값으로 바꾼다.
export const runAnalysis = async (payload) => {
  const model = getModel();
  const body = buildRequestBody(payload, model);
  const blocked = blockReason(getUsage(), getLimits(), model, body.length);
  if (blocked) return { error: blocked, blocked: true };
  const reserved = worstCaseUsd(model, body.length);
  const before = getUsage();
  writeJson(USAGE_KEY, { ...before, calls: before.calls + 1, usd: before.usd + reserved });
  const settle = (usd, tokens = { input: 0, output: 0 }) => {
    const u = getUsage();
    writeJson(USAGE_KEY, { ...u, usd: Math.max(u.usd - reserved, 0) + usd, input: u.input + tokens.input, output: u.output + tokens.output });
  };
  try {
    const res = await BudgetPlugin.claudeMessages({ body, fallback: !!CLAUDE_MODELS.find((m) => m.id === model)?.fallback });
    const parsed = parseResponse(res.status, res.body);
    settle(parsed.usd, parsed.tokens);
    return { ...parsed, model: parsed.model || model };
  } catch (e) {
    if (e?.message === "NO_KEY") {
      settle(0);
      return { error: "저장된 API 키를 읽을 수 없습니다. 키를 다시 넣어 주세요.", noKey: true };
    }
    return { error: "네트워크 오류로 분석하지 못했습니다." }; // 청구 여부를 알 수 없어 잡아 둔 비용을 그대로 둔다.
  }
};

export const formatTokens = (n) => (n >= 10000 ? `${(n / 1000).toFixed(1)}K` : String(n || 0));
export const formatUsd = (v) => {
  if (!v) return "$0";
  return v < 0.01 ? "$0.01 미만" : `$${v.toFixed(2)}`;
};
