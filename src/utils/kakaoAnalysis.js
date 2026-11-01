// 카카오뱅크 탭의 Claude 분석 — 보낼 집계와 월별 결과 저장. 호출·상한은 claudeClient.js 공용.
import { byCategory, byMerchant, budgetSummary, daysInYm, monthSpend, parseYm, shiftYm, spendOf, toYm, txsOfMonth } from "./kakaoStats";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const RESULT_PREFIX = "kakaoClaudeResult:";

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

const readResult = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
};
export const loadResult = (ym) => readResult(RESULT_PREFIX + ym);
export const saveResult = (ym, result) => {
  try {
    localStorage.setItem(RESULT_PREFIX + ym, JSON.stringify({ ...result, at: Date.now() }));
  } catch {
    /* 저장 실패해도 이번 결과는 화면에 보인다 */
  }
};
export const monthLabel = (ym) => `${parseYm(ym).getFullYear()}년 ${parseYm(ym).getMonth() + 1}월`;
