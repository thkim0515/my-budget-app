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

// ts 시점의 통장 잔액과 마이너스(비상금대출) 사용액. 기준 시점의 잔액·사용액에서 시작해 거래를 시간순으로 따라간다.
// 입금(취소 포함)은 마이너스 사용액부터 갚고 남는 금액만 잔액으로, 출금은 잔액부터 쓰고 0 아래로 가면 사용액이 늘어난다.
// 기준 시점 이전은 거꾸로 따라갈 수 없어 기준 시점의 값을 그대로 쓴다.
export const splitNet = (txs, flow, ts = Date.now()) => {
  if (flow.anchorAt == null) return null;
  const start = (flow.anchorNet || 0) + (flow.anchorLoan || 0);
  let balance = Math.max(start, 0);
  let used = (flow.anchorLoan || 0) + Math.max(-start, 0);
  txs
    .filter((t) => t.ts > flow.anchorAt && t.ts <= ts && flowOf(t) !== 0)
    .sort((a, b) => a.ts - b.ts)
    .forEach((t) => {
      const amount = flowOf(t);
      if (amount > 0) {
        const repay = Math.min(used, amount);
        used -= repay;
        balance += amount - repay;
      } else {
        const fromBalance = Math.min(balance, -amount);
        balance -= fromBalance;
        used += -amount - fromBalance;
      }
    });
  return { balance, used, available: balance + Math.max((flow.limit || 0) - used, 0) };
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

// 목록용 날짜·시각. 올해가 아니면 연도(26. 2. 14.)를 붙여 과거 내역임을 알린다.
export const formatWhen = (ts) => {
  const d = new Date(ts);
  const opts = { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" };
  return d.toLocaleString("ko-KR", d.getFullYear() === new Date().getFullYear() ? opts : { year: "2-digit", ...opts });
};
