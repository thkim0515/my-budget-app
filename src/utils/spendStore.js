// 전체 소비 저장: spendTx(지출, 동기화 대상) + spendNoti(알림 원문, 기기 전용). 카카오뱅크는 탭 2의 kakaoTx 를 그대로 합쳐 보여 준다.
import { categoryFor, loadSpendSourceIds } from "./kakaoIngest";
import { isSameTx } from "./statementImport";
import { isKakaoBankNotification, parseKakaoNotification, findCancelTarget } from "./kakaoParser";
import { buildKnown, matchLocal } from "./spendClassify";
import { findDuplicate, matchSource, parseSpendNotification, SOURCES, sourceById } from "./spendParser";

const SOURCES_KEY = "spendSources";
const KEEP_PARSED_RAW = 300;

// 전체 소비 탭에서 고른 금융사. ② 카카오뱅크 탭의 자동 인식과는 별개다.
export const loadSelectedSources = () => loadSpendSourceIds().filter((id) => sourceById(id));
export const saveSelectedSources = (ids) => {
  try {
    localStorage.setItem(SOURCES_KEY, JSON.stringify(ids));
  } catch {
    /* 저장 실패 시 이전 선택 유지 */
  }
};

const newId = () => crypto.randomUUID();

// 지출 통합 목록. 카카오뱅크 탭 내역은 결제·취소만 함께 보여 주고(입금·이체·대출 제외), 탭 ③에서 체크했을 때만 넣는다.
export const mergeSpend = (spendTxs, kakaoTxs, selected = ["kakaobank"]) => {
  const useKakao = selected.includes("kakaobank");
  const kakao = (useKakao ? kakaoTxs : [])
    .filter((t) => (t.kind === "payment" || t.kind === "refund") && !t.excludeFromFlow)
    .map((t) => ({ ...t, sourceId: "kakaobank", store: "kakaoTx" }));
  // 페이 알림이 카카오뱅크 결제와 겹치면 카카오뱅크 쪽만 센다(저장 순서와 무관하게 이중 집계를 막는다).
  const others = spendTxs
    .filter((t) => t.kind === "payment" || t.kind === "refund")
    .filter((t) => !(sourceById(t.sourceId)?.pay && kakao.some((k) => k.kind === t.kind && k.amount === t.amount && Math.abs(k.ts - t.ts) < 3 * 60 * 1000)))
    // 거래내역서로 넣은 카카오뱅크 내역이 알림 내역과 겹치면 한 번만 센다.
    .filter((t) => !(t.sourceId === "kakaobank" && kakao.some((k) => isSameTx({ ...t, hasTime: true }, k))))
    .map((t) => ({ ...t, store: "spendTx" }));
  return [...kakao, ...others].sort((a, b) => b.ts - a.ts);
};

export const ingestSpendNotifications = async (notis, { db, getAll, add, deleteItem }) => {
  const selected = loadSelectedSources();
  if (!db || selected.length === 0) return;
  const existing = await getAll("spendTx");
  const kakao = (await getAll("kakaoTx")).map((t) => ({ ...t, sourceId: "kakaobank" }));
  let changed = false;

  for (const noti of notis) {
    const match = matchSource(noti, selected);
    if (!match) continue;
    const { source, channel } = match;
    const rawBase = { id: newId(), ts: noti.time || Date.now(), sourceId: source.id, title: noti.title || "", text: noti.text || "", pkg: noti.package || "" };

    if (source.id === "kakaobank") {
      // 저장은 kakaoIngest 가 kakaoTx 에 한다. 여기서는 읽지 못한 알림만 미분류로 남긴다.
      const parsed = isKakaoBankNotification(noti) ? parseKakaoNotification(noti) : { result: "ignored" };
      if (parsed.result === "ignored" && parsed.reason === "금액 없음" && channel !== "other") {
        await db.put("spendNoti", { ...rawBase, status: "unclassified", reason: parsed.reason });
        changed = true;
      }
      continue;
    }

    const parsed = parseSpendNotification(noti, source, channel);
    if (parsed.result === "ignored") continue;
    if (parsed.result === "unclassified") {
      await db.put("spendNoti", { ...rawBase, status: "unclassified", reason: parsed.reason });
      changed = true;
      continue;
    }
    const tx = parsed.tx;
    if (findDuplicate(tx, [...existing, ...kakao])) continue;
    if (tx.kind === "refund") {
      const target = findCancelTarget(tx, existing.filter((e) => e.sourceId === tx.sourceId));
      if (target) {
        await deleteItem("spendTx", target.id, true);
        target.isDeleted = true;
        changed = true;
        continue;
      }
    }
    const record = { ...tx, category: matchLocal(tx.merchant, buildKnown([])) || categoryFor(tx) }; // 사용자가 정한 분류가 먼저
    record.id = await add("spendTx", record, true);
    existing.push(record);
    await db.put("spendNoti", { ...rawBase, status: "parsed", txId: record.id });
    changed = true;
  }
  if (changed) await pruneRaw(db);
};

// 저장된 내역의 원문은 최근 것만 남긴다. 미분류는 사용자가 처리할 때까지 둔다.
const pruneRaw = async (db) => {
  const all = await db.getAll("spendNoti");
  const parsed = all.filter((n) => n.status === "parsed").sort((a, b) => b.ts - a.ts);
  for (const old of parsed.slice(KEEP_PARSED_RAW)) await db.delete("spendNoti", old.id);
};

// 가계부에 이미 쌓인 내역 중 체크한 금융사 것을 가져온다. 여러 번 눌러도 다시 들어오지 않는다.
export const importSpendFromRecords = async ({ getAll, add }) => {
  const selected = SOURCES.filter((s) => s.recordSource && s.id !== "kakaobank" && loadSelectedSources().includes(s.id));
  const records = await getAll("records");
  const existing = await getAll("spendTx");
  const imported = new Set(existing.map((t) => t.sourceRecordId).filter(Boolean));
  let count = 0;
  for (const r of records) {
    const source = selected.find((s) => s.recordSource === r.source);
    if (!source || r.type === "income" || imported.has(r.id)) continue;
    const ts = new Date(r.createdAt || r.date).getTime();
    if (!ts) continue;
    if (r.isTransfer) continue; // 지출만 모은다
    const tx = { ts, kind: "payment", amount: r.amount, sourceId: source.id, pkg: "import" };
    if (existing.some((e) => !e.isDeleted && e.sourceId === source.id && e.amount === r.amount && e.kind === tx.kind && Math.abs(e.ts - ts) < 5 * 60 * 1000)) continue;
    await add("spendTx", { ...tx, merchant: r.title, category: r.category || "기타", installment: 0, inputMode: "import", sourceRecordId: r.id }, true);
    count += 1;
  }
  return count;
};
