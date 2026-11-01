// 카카오뱅크 탭의 집계 — 화면과 분리한 순수 함수. 시각은 기기 시간대 기준.
const pad = (n) => String(n).padStart(2, "0");

export const toDateKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toYm = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const parseYm = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1, 1);
};
export const shiftYm = (ym, delta) => {
  const d = parseYm(ym);
  return toYm(new Date(d.getFullYear(), d.getMonth() + delta, 1));
};
export const daysInYm = (ym) => {
  const d = parseYm(ym);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
};

export const KIND_LABEL = { payment: "결제", transfer: "이체·출금", income: "입금", refund: "결제 취소" };

// 결제 금액(취소는 음수). 이체·입금은 소비가 아니라 0.
export const spendOf = (tx) => (tx.kind === "payment" ? tx.amount : tx.kind === "refund" ? -tx.amount : 0);
// 통장에 미치는 금액(입금·취소 +, 결제·이체 -).
export const flowOf = (tx) => (tx.excludeFromFlow ? 0 : tx.kind === "income" || tx.kind === "refund" ? tx.amount : -tx.amount);

const inRange = (tx, from, to) => tx.ts >= from && tx.ts < to;
const sum = (list, fn) => list.reduce((acc, x) => acc + fn(x), 0);
const monthBounds = (ym) => {
  const start = parseYm(ym);
  return [start.getTime(), new Date(start.getFullYear(), start.getMonth() + 1, 1).getTime()];
};

export const txsOfMonth = (txs, ym) => {
  const [from, to] = monthBounds(ym);
  return txs.filter((t) => inRange(t, from, to));
};
export const monthSpend = (txs, ym) => sum(txsOfMonth(txs, ym), spendOf);

// 일별: 날짜마다 결제액·이번 달 누적·전월 같은 날까지의 누적. 미래 날짜의 누적은 null(선을 끊는다).
export const dailySeries = (txs, ym, now = new Date()) => {
  const days = daysInYm(ym);
  const prevYm = shiftYm(ym, -1);
  const prevDays = daysInYm(prevYm);
  const perDay = (list) => {
    const arr = new Array(32).fill(0);
    list.forEach((t) => { arr[new Date(t.ts).getDate()] += spendOf(t); });
    return arr;
  };
  const cur = perDay(txsOfMonth(txs, ym));
  const prev = perDay(txsOfMonth(txs, prevYm));
  const currentYm = toYm(now);
  const lastDay = ym === currentYm ? now.getDate() : ym > currentYm ? 0 : days;
  let cum = 0;
  let prevCum = 0;
  const rows = [];
  for (let day = 1; day <= days; day++) {
    cum += cur[day];
    if (day <= prevDays) prevCum += prev[day];
    rows.push({
      key: `${ym}-${pad(day)}`,
      label: String(day),
      day,
      spend: cur[day],
      cum: day <= lastDay ? cum : null,
      prevCum: day <= prevDays ? prevCum : null,
    });
  }
  return rows;
};

// 주별(월요일 시작): 이번 주를 포함해 최근 count 주.
export const weeklySeries = (txs, count = 10, now = new Date()) => {
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const rows = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - i * 7);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
    rows.push({
      key: toDateKey(start),
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      from: start.getTime(),
      to: end.getTime(),
      spend: sum(txs.filter((t) => inRange(t, start.getTime(), end.getTime())), spendOf),
    });
  }
  return rows;
};

// 월별: 최근 count 개월.
export const monthlySeries = (txs, count = 12, now = new Date()) => {
  const rows = [];
  for (let i = count - 1; i >= 0; i--) {
    const ym = shiftYm(toYm(now), -i);
    const [from, to] = monthBounds(ym);
    rows.push({ key: ym, label: `${parseYm(ym).getMonth() + 1}월`, from, to, spend: monthSpend(txs, ym) });
  }
  return rows;
};

const groupSpend = (list, keyOf) => {
  const map = new Map();
  list.forEach((t) => {
    const s = spendOf(t);
    if (!s) return;
    const key = keyOf(t);
    const row = map.get(key) || { name: key, amount: 0, count: 0 };
    row.amount += s;
    if (t.kind === "payment") row.count += 1;
    map.set(key, row);
  });
  return [...map.values()].filter((r) => r.amount > 0).sort((a, b) => b.amount - a.amount);
};
export const byCategory = (list) => groupSpend(list, (t) => t.category || "기타");
export const byMerchant = (list) => groupSpend(list, (t) => t.merchant || "알 수 없음");

// ---- 자금 흐름 ----
// anchorNet: anchorAt 시점의 순자금(통장 잔액 - 마이너스 사용액). 이후 거래는 더하고, 이전 시점은 거꾸로 빼서 추이를 만든다.
export const netAt = (txs, flow, ts) => {
  if (flow.anchorAt == null) return null;
  const from = Math.min(ts, flow.anchorAt);
  const to = Math.max(ts, flow.anchorAt);
  const moved = sum(txs.filter((t) => t.ts > from && t.ts <= to), flowOf);
  return ts >= flow.anchorAt ? flow.anchorNet + moved : flow.anchorNet - moved;
};

export const flowSeries = (txs, flow, days = 30, now = new Date()) => {
  if (flow.anchorAt == null) return [];
  const rows = [];
  for (let i = days - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
    const dayTxs = txs.filter((t) => inRange(t, start.getTime(), end.getTime()) && !t.excludeFromFlow);
    rows.push({
      key: toDateKey(start),
      label: `${start.getMonth() + 1}/${start.getDate()}`,
      net: netAt(txs, flow, Math.min(end.getTime() - 1, now.getTime())),
      inflow: sum(dayTxs.filter((t) => flowOf(t) > 0), flowOf),
      outflow: sum(dayTxs.filter((t) => flowOf(t) < 0), (t) => -flowOf(t)),
    });
  }
  return rows;
};

// 순자금을 통장 잔액과 마이너스 사용액으로 나눈다. anchorLoan 은 잔액과 별도로 남아 있는 대출(비상금대출)이다.
export const splitNet = (net, flow) => {
  const loan = flow.anchorLoan || 0;
  const balance = net + loan;
  const used = balance < 0 ? loan - balance : loan;
  return { balance: Math.max(balance, 0), used, available: Math.max(balance, 0) + Math.max((flow.limit || 0) - used, 0) };
};

// 월 예산 + 이번 달 보정 - 이번 달 결제 = 남은 예산. 오늘을 포함한 남은 날수로 나눠 하루 권장액을 낸다.
export const budgetSummary = (txs, flow, now = new Date()) => {
  const ym = toYm(now);
  const spent = monthSpend(txs, ym);
  const adjust = flow.budgetAdjustYm === ym ? flow.budgetAdjust || 0 : 0;
  const budget = (flow.monthlyBudget || 0) + adjust;
  const hasBudget = !!flow.monthlyBudget || flow.budgetAdjustYm === ym;
  const remaining = budget - spent;
  const daysLeft = daysInYm(ym) - now.getDate() + 1;
  return { ym, spent, budget, hasBudget, remaining, daysLeft, perDay: Math.max(Math.floor(remaining / daysLeft), 0) };
};

// "지금 남은 예산"을 직접 넣었을 때 그 값이 되도록 하는 보정값.
export const adjustmentForRemaining = (txs, flow, remaining, now = new Date()) =>
  remaining + monthSpend(txs, toYm(now)) - (flow.monthlyBudget || 0);
