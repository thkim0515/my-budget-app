// 분류 정리 — 1단계(무료): 이전 분류·학습 규칙으로 카테고리 지정. 2단계(Claude): 남은 가맹점만 모아 분류. 3단계(동의 시): 읽지 못한 알림을 가려서 읽기.
import { runClaude } from "./claudeClient";
import { loadMerchantRules, rememberMerchantCategory } from "./kakaoIngest";
import { SPEND_CATEGORIES } from "./spendParser";

const TIDY_ENABLED_KEY = "spendTidyEnabled";
const TIDY_DATE_KEY = "spendTidyDate";
const RAW_CONSENT_KEY = "spendRawHelp";
const HIGH_CONFIDENCE = 0.8;
const MAX_MERCHANTS = 60;
const MAX_RAW = 20;

const readFlag = (key) => {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
};
const writeValue = (key, value) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* 저장 실패 시 다음에 다시 묻는다 */
  }
};
export const isTidyEnabled = () => readFlag(TIDY_ENABLED_KEY);
export const setTidyEnabled = (on) => writeValue(TIDY_ENABLED_KEY, on);
export const hasRawConsent = () => readFlag(RAW_CONSENT_KEY);
export const setRawConsent = (on) => writeValue(RAW_CONSENT_KEY, on);

// 비교용 가맹점 이름 — 공백·기호·법인 표기·지점명을 뺀다.
export const normalizeMerchant = (name) => {
  const words = (name || "").toLowerCase().replace(/\(주\)|㈜|주식회사/g, " ").replace(/[()[\]\-_.,·*/]/g, " ").trim().split(/\s+/);
  if (words.length > 1 && /(점|지점|호점|센터)$/.test(words[words.length - 1])) words.pop();
  return words.join("").replace(/^([a-z0-9]+)[가-힣]+(점|지점)$/, "$1");
};

const isUnsorted = (t) => t.kind === "payment" && (!t.category || t.category === "기타") && !t.categoryLocked;

// 1단계: 규칙 → 같은 이름 → 포함 관계(3글자 이상) 순서로 카테고리를 찾는다.
export const matchLocal = (merchant, knownEntries) => {
  const key = normalizeMerchant(merchant);
  if (!key) return null;
  const exact = knownEntries.find(([name]) => name === key);
  if (exact) return exact[1];
  // 포함 관계는 3글자 이상, 2글자 이름(쿠팡 등)은 앞부분이 같을 때만 같다고 본다.
  const partial = knownEntries.find(([name]) => {
    const shorter = Math.min(name.length, key.length);
    if (shorter >= 3) return name.includes(key) || key.includes(name);
    return shorter === 2 && (name.startsWith(key) || key.startsWith(name));
  });
  return partial ? partial[1] : null;
};

// 사용자가 고른 규칙을 앞에 두고, 이전에 분류된 내역을 많이 쓰인 순서로 잇는다.
export const buildKnown = (txs, rules = loadMerchantRules()) => {
  const counts = new Map();
  txs.forEach((t) => {
    if (t.isDeleted || t.kind !== "payment" || !t.category || t.category === "기타" || t.autoCategory?.by === "claude-low") return;
    const key = normalizeMerchant(t.merchant);
    if (!key) return;
    const row = counts.get(key) || {};
    row[t.category] = (row[t.category] || 0) + 1;
    counts.set(key, row);
  });
  const fromHistory = [...counts.entries()].map(([name, row]) => [name, Object.entries(row).sort((a, b) => b[1] - a[1])[0][0]]);
  const fromRules = Object.entries(rules).filter(([, c]) => c !== "기타").map(([name, c]) => [normalizeMerchant(name), c]);
  return [...fromRules, ...fromHistory];
};

const allTxs = async (getAll) => {
  const [spend, kakao] = await Promise.all([getAll("spendTx"), getAll("kakaoTx")]);
  return [...spend.map((t) => ({ t, store: "spendTx" })), ...kakao.map((t) => ({ t, store: "kakaoTx" }))];
};

export const tidyLocal = async ({ getAll, put }) => {
  const rows = await allTxs(getAll);
  const known = buildKnown(rows.map((r) => r.t));
  let applied = 0;
  for (const { t, store } of rows) {
    if (!isUnsorted(t)) continue;
    const category = matchLocal(t.merchant, known);
    if (!category) continue;
    await put(store, { ...t, category, autoCategory: { by: "rule", from: t.category || "기타", at: Date.now() } }, true);
    applied += 1;
  }
  return applied;
};

const amountBand = (n) => {
  if (n < 10000) return "1만원 미만";
  if (n < 30000) return "1~3만원";
  if (n < 100000) return "3~10만원";
  return "10만원 이상";
};
const timeBand = (ts) => ["새벽", "오전", "오후", "저녁"][Math.floor(new Date(ts).getHours() / 6)];

// 2단계에 보낼 값: 가맹점 이름·금액대·시간대·건수뿐이다.
export const buildClassifyPayload = (rows) => {
  const groups = new Map();
  rows.forEach(({ t }) => {
    const key = normalizeMerchant(t.merchant);
    if (!groups.has(key)) groups.set(key, { key, 가맹점: t.merchant, 금액대: amountBand(t.amount), 시간대: timeBand(t.ts), 건수: 0 });
    groups.get(key).건수 += 1;
  });
  const list = [...groups.values()].slice(0, MAX_MERCHANTS);
  return {
    keys: list.map((g) => g.key),
    payload: {
      카테고리목록: SPEND_CATEGORIES.filter((c) => c !== "기타"),
      가맹점: list.map(({ key, ...rest }, id) => ({ id, ...rest })),
    },
  };
};

const CLASSIFY_SYSTEM = `가맹점 이름과 금액대·시간대를 보고 각 가맹점을 주어진 카테고리 중 하나로 분류합니다.
모르는 이름이면 추측하되 confidence 를 낮게 줍니다. confidence 는 0~1 입니다. 카테고리는 목록에 있는 말을 그대로 씁니다.`;
const CLASSIFY_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { id: { type: "integer" }, category: { type: "string" }, confidence: { type: "number" } },
        required: ["id", "category", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

// 확신도가 높으면 바로 적용, 낮으면 추천으로 둔다. 추천이 이미 있는 내역은 다시 보내지 않는다.
export const tidyWithClaude = async ({ getAll, put }) => {
  await tidyLocal({ getAll, put }); // 사용자가 정한 가맹점은 Claude 에 묻지 않는다
  const rows = (await allTxs(getAll)).filter(({ t }) => isUnsorted(t) && !t.suggestedCategory);
  if (rows.length === 0) return { applied: 0, suggested: 0, skipped: true };
  const { keys, payload } = buildClassifyPayload(rows);
  const out = await runClaude(payload, { system: CLASSIFY_SYSTEM, schema: CLASSIFY_SCHEMA, effort: "low", maxTokens: 4000 });
  if (!out.analysis) return { error: out.error, noKey: out.noKey, blocked: out.blocked, applied: 0, suggested: 0 };
  let applied = 0;
  let suggested = 0;
  for (const item of out.analysis.items || []) {
    const key = keys[item.id];
    if (!key || !SPEND_CATEGORIES.includes(item.category) || item.category === "기타") continue;
    for (const { t, store } of rows.filter((r) => normalizeMerchant(r.t.merchant) === key)) {
      if (item.confidence >= HIGH_CONFIDENCE) {
        await put(store, { ...t, category: item.category, autoCategory: { by: "claude", from: t.category || "기타", confidence: item.confidence, at: Date.now() } }, true);
        applied += 1;
      } else {
        await put(store, { ...t, suggestedCategory: item.category, suggestedConfidence: item.confidence }, true);
        suggested += 1;
      }
    }
  }
  return { applied, suggested, tokens: out.tokens, usd: out.usd };
};

// 사용자의 결정 — 이후 자동으로 바꾸지 않고, 고른 분류는 규칙으로 배운다.
export const acceptSuggestion = async (row, category, { put }) => {
  const { store, suggestedCategory, suggestedConfidence, ...rest } = row;
  rememberMerchantCategory(row.merchant, category);
  await put(store, { ...rest, category, categoryLocked: true });
};
export const undoAutoCategory = async (row, { put }) => {
  const { store, autoCategory, ...rest } = row;
  await put(store, { ...rest, category: autoCategory?.from || "기타", categoryLocked: true });
};

// 하루 한 번(설정을 켠 경우). 호출 없이 끝나면 날짜만 남긴다.
export const runDailyTidy = async (helpers, now = new Date()) => {
  await tidyLocal(helpers);
  if (!isTidyEnabled()) return null;
  const today = now.toDateString();
  let last = "";
  try {
    last = localStorage.getItem(TIDY_DATE_KEY) || "";
  } catch {
    last = "";
  }
  if (last === today) return null;
  const result = await tidyWithClaude(helpers);
  if (!result.error) writeValue(TIDY_DATE_KEY, today);
  return result;
};

// 3단계: 읽지 못한 알림. 긴 숫자·가려진 이름·잔액·계좌 정보를 지운 문장만 보낸다.
export const maskNotification = (text) => (text || "")
  .replace(/(?:잔액|잔여한도|누적|계좌)\s*:?\s*-?[\d,]*\s*원?/g, " ")
  .replace(/\d{2,6}-\d{2,6}(?:-\d{1,8})*/g, "[번호]")
  .replace(/\d{4,}(?![\d,]*\s*원)/g, "[번호]")
  .replace(/[가-힣A-Za-z]\*+[가-힣A-Za-z]?/g, "[이름]")
  .replace(/\s+/g, " ")
  .trim();

const RAW_SYSTEM = `금융 알림 문장에서 지출 정보를 뽑습니다. [번호]·[이름]은 가려진 값입니다.
지출(결제 또는 결제 취소)이 아니면 isExpense 를 false 로 둡니다. 원화 금액을 알 수 없으면 amount 는 0 입니다. confidence 는 0~1 입니다.`;
const RAW_SCHEMA = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "integer" }, isExpense: { type: "boolean" }, amount: { type: "integer" }, merchant: { type: "string" },
          kind: { type: "string", enum: ["payment", "refund"] }, confidence: { type: "number" },
        },
        required: ["id", "isExpense", "amount", "merchant", "kind", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["items"],
  additionalProperties: false,
};

// 동의한 경우에만. 확신도가 높으면 지출로 저장하고, 낮으면 입력칸에 채울 추천으로 남긴다.
export const parseRawWithClaude = async (notis, { db, add }) => {
  if (!hasRawConsent()) return { error: "동의가 필요합니다." };
  const list = notis.slice(0, MAX_RAW);
  const out = await runClaude({ 알림: list.map((n, id) => ({ id, 문장: maskNotification(`${n.title} ${n.text}`) })) }, { system: RAW_SYSTEM, schema: RAW_SCHEMA, effort: "low", maxTokens: 3000 });
  if (!out.analysis) return { error: out.error, noKey: out.noKey, saved: 0, suggested: 0 };
  let saved = 0;
  let suggested = 0;
  for (const item of out.analysis.items || []) {
    const n = list[item.id];
    if (!n) continue;
    if (!item.isExpense) {
      await db.put("spendNoti", { ...n, reason: "Claude: 지출이 아닌 알림으로 판단", suggestion: { isExpense: false } });
    } else if (item.confidence >= HIGH_CONFIDENCE && item.amount > 0) {
      const id = await add("spendTx", { ts: n.ts, kind: item.kind, amount: item.amount, merchant: item.merchant.slice(0, 40), category: "기타", installment: 0, inputMode: "claude", pkg: n.pkg || "", sourceId: n.sourceId }, true);
      await db.put("spendNoti", { ...n, status: "parsed", txId: id });
      saved += 1;
    } else {
      await db.put("spendNoti", { ...n, suggestion: item });
      suggested += 1;
    }
  }
  return { saved, suggested, tokens: out.tokens, usd: out.usd };
};
