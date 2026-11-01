// 알림 큐 → 카카오뱅크 탭 저장. useNativeSync 와 "가계부에서 가져오기"가 쓴다.
import { detectCategory } from "./notiParser";
import { findCancelTarget, isDuplicateKakaoTx, isKakaoBankNotification, parseKakaoNotification } from "./kakaoParser";

const LOG_KEY = "kakaoNotiLog";
const FLOW_KEY = "kakaoFlow";
const MERCHANT_CATEGORY_KEY = "kakaoMerchantCategory";

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
    /* 기록 저장 실패는 거래 저장에 영향이 없다 */
  }
};

export const DEFAULT_FLOW = {
  autoSave: true,
  monthlyBudget: 0,
  budgetAdjust: 0,
  budgetAdjustYm: "",
  limit: 0,
  anchorNet: 0,
  anchorLoan: 0,
  anchorAt: null,
};
export const loadFlow = () => ({ ...DEFAULT_FLOW, ...readJson(FLOW_KEY, {}) });
export const saveFlow = (flow) => writeJson(FLOW_KEY, flow);

// 인식 기록(기기 안에만, 최근 30건) — 알림 형식이 달라 놓치면 원문을 보고 직접 추가할 수 있게 한다.
export const loadNotiLog = () => readJson(LOG_KEY, []);
const appendNotiLog = (rows) => writeJson(LOG_KEY, [...rows, ...loadNotiLog()].slice(0, 30));

export const loadMerchantRules = () => readJson(MERCHANT_CATEGORY_KEY, {});

// 전체 소비 탭에서 고른 금융사. ② 카카오뱅크 탭의 자동 인식과는 별개 설정이다.
export const loadSpendSourceIds = () => readJson("spendSources", []);

export const rememberMerchantCategory = (merchant, category) => {
  writeJson(MERCHANT_CATEGORY_KEY, { ...readJson(MERCHANT_CATEGORY_KEY, {}), [merchant]: category });
};

export const categoryFor = (tx) => {
  if (tx.kind === "income") return "입금";
  if (tx.kind === "transfer") return "이체";
  return readJson(MERCHANT_CATEGORY_KEY, {})[tx.merchant] || detectCategory(tx.merchant);
};

export const ingestKakaoNotifications = async (notis, { getAll, add, deleteItem }) => {
  const targets = notis.filter(isKakaoBankNotification);
  const forFlow = loadFlow().autoSave;
  const forSpend = loadSpendSourceIds().includes("kakaobank");
  if (targets.length === 0 || (!forFlow && !forSpend)) return;

  const existing = await getAll("kakaoTx");
  const log = [];
  for (const noti of targets) {
    const parsed = parseKakaoNotification(noti);
    const entry = { title: noti.title, text: noti.text, time: noti.time || Date.now(), status: parsed.reason || "저장" };
    log.unshift(entry);
    if (parsed.result !== "tx") continue;

    const tx = parsed.tx;
    if (isDuplicateKakaoTx(tx, existing)) {
      entry.status = "중복";
      continue;
    }
    if (tx.kind === "refund") {
      const target = findCancelTarget(tx, existing);
      if (target) {
        await deleteItem("kakaoTx", target.id, true);
        target.isDeleted = true;
        entry.status = "원래 결제 취소 처리";
        continue;
      }
    }
    const record = { ...tx, category: categoryFor(tx) };
    if (!forFlow) record.spendOnly = true; // 자금 관리 탭의 잔액 계산에는 넣지 않는다
    record.id = await add("kakaoTx", record, true);
    existing.push(record);
  }
  appendNotiLog(log);
};

// 가계부에 이미 쌓인 카카오뱅크 내역을 탭으로 가져온다. 여러 번 눌러도 다시 들어오지 않는다.
export const importFromRecords = async ({ getAll, add }) => {
  const records = await getAll("records");
  const existing = await getAll("kakaoTx");
  const imported = new Set(existing.map((t) => t.sourceRecordId).filter(Boolean));
  let count = 0;
  for (const r of records) {
    if (r.source !== "카카오뱅크" || imported.has(r.id)) continue;
    const ts = new Date(r.createdAt || r.date).getTime();
    if (!ts) continue;
    const kind = r.type === "income" ? "income" : r.isTransfer ? "transfer" : "payment";
    if (existing.some((t) => !t.isDeleted && t.amount === r.amount && t.kind === kind && Math.abs(t.ts - ts) < 5 * 60 * 1000)) continue;
    await add("kakaoTx", {
      ts, kind, amount: r.amount, merchant: r.title, category: kind === "payment" ? r.category || "기타" : kind === "income" ? "입금" : "이체",
      balanceAfter: null, excludeFromFlow: false, inputMode: "import", pkg: "", sourceRecordId: r.id,
    }, true);
    count += 1;
  }
  return count;
};
