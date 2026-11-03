// Claude 사용량을 우리 서버(our-days `claudeUsageLog`)로 보내 앱 허브 "Claude 사용량" 화면에 모은다.
// 보내는 것: 토큰 수·모델·기능명·날짜뿐(가계부 내용·프롬프트·API 키 없음). 같은 날·기능·모델은 한 줄로 합쳐 localStorage 에 두고
// 5분에 한 번 이하로 묶어 보낸다. 실패하면 남겨 두었다가 다음 기록·앱 시작 때 다시 보낸다(7일 지난 줄은 버림).
const ENDPOINT = "https://asia-northeast3-our-days-f8384.cloudfunctions.net/claudeUsageLog?app=mybudget";
const Q_KEY = "claudeUsageQueue";
const LAST_KEY = "claudeUsageLastSent";
const DEV_KEY = "claudeUsageDevice";
const MIN_GAP_MS = 5 * 60_000;

export const kstDay = (ms) => new Date(ms + 9 * 3600_000).toISOString().slice(0, 10);

const read = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};
const write = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* 저장 못 하면 이번 기록만 잃는다 */
  }
};

// 큐: { "날짜|기능|모델": { n, i, o, cr, cw } }
export const addToQueue = (q, day, feature, model, u = {}) => {
  const k = `${day}|${feature}|${model}`;
  const r = q[k] || { n: 0, i: 0, o: 0, cr: 0, cw: 0 };
  return {
    ...q,
    [k]: {
      n: r.n + 1,
      i: r.i + (u.input_tokens || 0),
      o: r.o + (u.output_tokens || 0),
      cr: r.cr + (u.cache_read_input_tokens || 0),
      cw: r.cw + (u.cache_creation_input_tokens || 0),
    },
  };
};

// 보낸 만큼 빼고 다 보낸 줄은 지운다(보내는 사이 더해진 양은 남는다)
export const subtractSent = (q, sent) => {
  const out = { ...q };
  for (const [k, s] of Object.entries(sent)) {
    const r = out[k];
    if (!r) continue;
    const left = { n: r.n - s.n, i: r.i - s.i, o: r.o - s.o, cr: r.cr - s.cr, cw: r.cw - s.cw };
    if (left.n <= 0) delete out[k];
    else out[k] = left;
  }
  return out;
};

export const dropOld = (q, now) => {
  const oldest = kstDay(now - 6 * 86_400_000);
  return Object.fromEntries(Object.entries(q).filter(([k]) => k.split("|")[0] >= oldest));
};

export const toItems = (q) =>
  Object.entries(q).map(([k, r]) => {
    const [d, f, m] = k.split("|");
    return { d, f, m, ...r };
  });

const deviceId = () => {
  let id = read(DEV_KEY, "");
  if (!id) {
    id = window.crypto?.randomUUID?.() || "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) => (c ^ (Math.random() * 16) >> (c / 4)).toString(16));
    write(DEV_KEY, id);
  }
  return id;
};

let sending = false;
export const flushClaudeUsage = async (now = Date.now()) => {
  if (sending || typeof fetch !== "function" || now - read(LAST_KEY, 0) < MIN_GAP_MS) return;
  const q = dropOld(read(Q_KEY, {}), now);
  write(Q_KEY, q);
  const batch = Object.fromEntries(Object.entries(q).slice(0, 50));
  if (!Object.keys(batch).length) return;
  sending = true;
  write(LAST_KEY, now);
  try {
    // text/plain 이라 사전 요청(OPTIONS) 없이 간다. 서버는 본문을 JSON 으로 읽는다
    const res = await fetch(ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain" }, body: JSON.stringify({ device: deviceId(), items: toItems(batch) }) });
    // 200 = 받음, 4xx(429 제외) = 다시 보내도 같다 → 지운다. 429·5xx 는 남겨 둔다
    if (res.status === 200 || (res.status >= 400 && res.status < 500 && res.status !== 429)) write(Q_KEY, subtractSent(read(Q_KEY, {}), batch));
  } catch {
    /* 네트워크 실패 — 남겨 두었다가 다음에 */
  } finally {
    sending = false;
  }
};

/** Claude 응답 하나의 usage 를 쌓고 보낼 때가 됐으면 보낸다. 실패해도 조용히 넘어간다 */
export const recordClaudeUsage = (feature, model, usage) => {
  try {
    if (!model || !usage) return;
    write(Q_KEY, addToQueue(read(Q_KEY, {}), kstDay(Date.now()), feature, model, usage));
    flushClaudeUsage();
  } catch {
    /* 본 기능을 막지 않는다 */
  }
};
