// 전체 소비 탭 집계 — 기간·구간·출처·시간대. 소비 금액 규칙은 kakaoStats 의 spendOf(결제 +, 취소 -, 이체 0).
import { byCategory, byMerchant, daysInYm, parseYm, spendOf, toDateKey, toYm } from "./kakaoStats";
import { sourceById } from "./spendParser";

const DAY = 86400000;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const BANDS = [["새벽(0~6시)", 0, 6], ["오전(6~12시)", 6, 12], ["오후(12~18시)", 12, 18], ["저녁(18~24시)", 18, 24]];

const dateOf = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// 기간: from 이상 to 미만(ms). key 는 분석 결과 저장에 쓴다.
export const monthPeriod = (ym) => {
  const start = parseYm(ym);
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
  return { key: ym, label: `${start.getFullYear()}년 ${start.getMonth() + 1}월`, from: start.getTime(), to: end.getTime(), start: toDateKey(start), end: `${ym}-${String(daysInYm(ym)).padStart(2, "0")}` };
};
export const rangePeriod = (startKey, endKey) => {
  const [a, b] = startKey <= endKey ? [startKey, endKey] : [endKey, startKey];
  const start = dateOf(a);
  const last = dateOf(b);
  const end = new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1);
  return { key: `${a}~${b}`, label: `${a} ~ ${b}`, from: start.getTime(), to: end.getTime(), start: a, end: b };
};
export const periodDays = (p) => Math.round((p.to - p.from) / DAY);

// 직전 같은 길이의 기간(월 기간이면 전달).
export const previousPeriod = (p) => {
  if (/^\d{4}-\d{2}$/.test(p.key)) {
    const d = parseYm(p.key);
    return monthPeriod(toYm(new Date(d.getFullYear(), d.getMonth() - 1, 1)));
  }
  const days = periodDays(p);
  const start = new Date(p.from);
  const prevStart = new Date(start.getFullYear(), start.getMonth(), start.getDate() - days);
  const prevLast = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
  return rangePeriod(toDateKey(prevStart), toDateKey(prevLast));
};

export const inPeriod = (txs, p) => txs.filter((t) => t.ts >= p.from && t.ts < p.to);
export const totalSpend = (list) => list.reduce((acc, t) => acc + spendOf(t), 0);

// 그래프 구간. 월별은 기간이 한 달뿐이면 흐름이 안 보여 최근 12개월로 넓힌다.
export const bucketSeries = (txs, p, unit) => {
  const buckets = [];
  if (unit === "day") {
    const longSpan = periodDays(p) > 31;
    for (let d = new Date(p.from); d.getTime() < p.to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      buckets.push({ key: toDateKey(d), label: longSpan || d.getDate() === 1 ? `${d.getMonth() + 1}/${d.getDate()}` : String(d.getDate()), title: `${d.getMonth() + 1}월 ${d.getDate()}일`, from: d.getTime(), to: next.getTime() });
    }
  } else if (unit === "week") {
    const first = new Date(p.from);
    let d = new Date(first.getFullYear(), first.getMonth(), first.getDate() - ((first.getDay() + 6) % 7));
    for (; d.getTime() < p.to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)) {
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7);
      buckets.push({ key: toDateKey(d), label: `${d.getMonth() + 1}/${d.getDate()}`, title: `${d.getMonth() + 1}/${d.getDate()} 시작 주`, from: Math.max(d.getTime(), p.from), to: Math.min(next.getTime(), p.to) });
    }
  } else {
    const first = new Date(p.from);
    const isSingleMonth = /^\d{4}-\d{2}$/.test(p.key);
    let d = isSingleMonth ? new Date(first.getFullYear(), first.getMonth() - 11, 1) : new Date(first.getFullYear(), first.getMonth(), 1);
    for (; d.getTime() < p.to; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
      const next = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      buckets.push({ key: toYm(d), label: `${d.getMonth() + 1}월`, title: `${d.getFullYear()}년 ${d.getMonth() + 1}월`, from: isSingleMonth ? d.getTime() : Math.max(d.getTime(), p.from), to: isSingleMonth ? next.getTime() : Math.min(next.getTime(), p.to) });
    }
  }
  return buckets.map((b) => ({ ...b, spend: totalSpend(txs.filter((t) => t.ts >= b.from && t.ts < b.to)) }));
};

export const bySource = (list) => byCategoryLike(list, (t) => sourceById(t.sourceId)?.name || "기타");
const byCategoryLike = (list, keyOf) => byCategory(list.map((t) => ({ ...t, category: keyOf(t) })));

export const byBand = (list) => BANDS.map(([name, a, b]) => {
  const rows = list.filter((t) => {
    const h = new Date(t.ts).getHours();
    return h >= a && h < b;
  });
  return { name, amount: Math.max(totalSpend(rows), 0), count: rows.filter((t) => t.kind === "payment").length };
});

export const byWeekday = (list) => WEEKDAYS.map((name, i) => ({ name, amount: Math.max(totalSpend(list.filter((t) => new Date(t.ts).getDay() === i)), 0) }));

const row = (r) => ({ 이름: r.name, 금액: r.amount, 건수: r.count });

// Claude 로 보내는 값은 이 집계뿐이다. 개별 거래·시각·알림 원문·잔액·계좌·이체 상대는 넣지 않는다.
export const buildSpendPayload = (txs, p) => {
  const list = inPeriod(txs, p);
  const prev = previousPeriod(p);
  return {
    기간: { 시작: p.start, 끝: p.end, 일수: periodDays(p) },
    결제합계: totalSpend(list),
    결제건수: list.filter((t) => t.kind === "payment").length,
    출처별: bySource(list).map(row),
    카테고리별: byCategory(list).map(row),
    가맹점상위15: byMerchant(list).slice(0, 15).map(row),
    시간대별: byBand(list).map((r) => ({ 시간대: r.name, 금액: r.amount, 건수: r.count })),
    요일별: byWeekday(list).map((r) => ({ 요일: r.name, 금액: r.amount })),
    직전기간결제합계: { 시작: prev.start, 끝: prev.end, 금액: totalSpend(inPeriod(txs, prev)) },
  };
};

// 기간별 분석 결과 — 같은 기간은 새 결과로 바꾸고 최근 30개를 둔다.
const RESULTS_KEY = "spendClaudeResults";
export const loadSpendResults = () => {
  try {
    return JSON.parse(localStorage.getItem(RESULTS_KEY)) || [];
  } catch {
    return [];
  }
};
export const saveSpendResult = (entry) => {
  const next = [{ ...entry, at: Date.now() }, ...loadSpendResults().filter((r) => r.key !== entry.key)].slice(0, 30);
  try {
    localStorage.setItem(RESULTS_KEY, JSON.stringify(next));
  } catch {
    /* 저장 실패해도 이번 결과는 화면에 보인다 */
  }
  return next;
};
