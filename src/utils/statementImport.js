// 거래내역 파일 → 지출 목록. 금융사마다 칸 이름이 달라 머리글 낱말로 칸을 찾는다.
// 입금·이체·대출은 뺀다(전체 소비는 사용한 금액만). 잔액·계좌번호·카드번호 칸은 읽지 않는다.
import { sourceById } from "./spendParser";
import { normalizeMerchant } from "./spendClassify";
import { categoryFor } from "./kakaoIngest";

const COLUMN_WORDS = {
  date: ["거래일시", "이용일시", "승인일시", "거래일자", "이용일자", "승인일자", "매출일자", "거래일", "이용일", "승인일", "일자", "일시", "날짜"],
  time: ["거래시간", "이용시간", "승인시간", "승인시각", "시간", "시각"],
  amount: ["거래금액", "이용금액", "승인금액", "결제금액", "사용금액", "금액"],
  out: ["출금금액", "출금액", "출금", "찾으신금액"],
  in: ["입금금액", "입금액", "입금", "맡기신금액"],
  merchant: ["이용가맹점", "가맹점명", "가맹점", "사용처", "거래내용", "내용", "적요", "받는분", "거래처"],
  type: ["거래구분", "거래유형", "구분", "유형", "상태", "취소여부", "승인구분"],
  install: ["할부개월", "할부", "이용구분"],
};
const NOT_SPEND = /입금|이체|송금|대출|이자\s*지급|저금통|세이프박스|적금|예금|환전|자동이체/;
const CANCEL = /취소|환불/;

const findColumn = (cells, words) => {
  for (const word of words) {
    const i = cells.findIndex((c) => c === word);
    if (i >= 0) return i;
  }
  for (const word of words) {
    const i = cells.findIndex((c) => c.includes(word));
    if (i >= 0) return i;
  }
  return -1;
};

// 머리글 행과 칸 위치. 날짜 칸과 금액(또는 출금) 칸이 함께 있는 첫 행을 머리글로 본다.
export const findHeader = (rows) => {
  for (let i = 0; i < Math.min(rows.length, 40); i++) {
    const cells = (rows[i] || []).map((c) => String(c ?? "").replace(/\s/g, ""));
    const columns = Object.fromEntries(Object.entries(COLUMN_WORDS).map(([k, words]) => [k, findColumn(cells, words)]));
    if (columns.date >= 0 && (columns.amount >= 0 || columns.out >= 0) && columns.merchant >= 0) return { index: i, columns };
  }
  return null;
};

const toNumber = (v) => {
  if (typeof v === "number") return v;
  const text = String(v ?? "").replace(/[,\s원]/g, "");
  const negative = /^\(.*\)$/.test(text) || text.startsWith("-");
  const n = parseFloat(text.replace(/[()\-+]/g, ""));
  if (Number.isNaN(n)) return null;
  return negative ? -n : n;
};

const pad = (n) => String(n).padStart(2, "0");

// 날짜 칸 → { ts, hasTime }. 엑셀 일련번호, "2026.10.05 12:30", "20261005" 등을 읽는다.
export const parseDateCell = (value, timeValue, now = new Date()) => {
  let y; let mo; let d; let h = null; let mi = 0;
  if (typeof value === "number" && value > 30000 && value < 80000) {
    const ms = Math.round((value - 25569) * 86400000);
    const u = new Date(ms);
    y = u.getUTCFullYear(); mo = u.getUTCMonth() + 1; d = u.getUTCDate();
    if (value % 1 > 0) { h = u.getUTCHours(); mi = u.getUTCMinutes(); }
  } else {
    const text = String(value ?? "").trim();
    let m = text.match(/(\d{4})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/) || text.match(/^(\d{4})(\d{2})(\d{2})/);
    if (m) {
      [y, mo, d] = m.slice(1, 4).map(Number);
    } else {
      m = text.match(/^(\d{1,2})\s*[.\-/월]\s*(\d{1,2})/);
      if (!m) return null;
      y = now.getFullYear(); mo = Number(m[1]); d = Number(m[2]);
    }
    const t = text.slice(m.index + m[0].length).match(/(\d{1,2}):(\d{2})/);
    if (t) { h = Number(t[1]); mi = Number(t[2]); }
  }
  if (h === null && timeValue != null && timeValue !== "") {
    if (typeof timeValue === "number" && timeValue < 1) {
      const minutes = Math.round(timeValue * 1440);
      h = Math.floor(minutes / 60); mi = minutes % 60;
    } else {
      const t = String(timeValue).match(/(\d{1,2}):?(\d{2})/);
      if (t) { h = Number(t[1]); mi = Number(t[2]); }
    }
  }
  if (!mo || mo > 12 || !d || d > 31) return null;
  const hasTime = h !== null && h < 24;
  return { ts: new Date(y, mo - 1, d, hasTime ? h : 12, mi).getTime(), hasTime, dateKey: `${y}-${pad(mo)}-${pad(d)}` };
};

// 표 → { items, skipped, errors? }. 은행은 음수가 출금, 카드는 음수가 취소다.
export const parseStatementRows = (rows, sourceId) => {
  const header = findHeader(rows);
  if (!header) return { error: "날짜·금액·가맹점 칸을 찾지 못했습니다. 칸 이름이 있는 거래내역 파일인지 확인해 주세요." };
  const { columns: c, index } = header;
  const body = rows.slice(index + 1);
  const bank = sourceId === "kakaobank";
  const items = [];
  let skipped = 0;
  for (const row of body) {
    if (!row || row.every((v) => v === "" || v == null)) continue;
    const when = parseDateCell(row[c.date], c.time >= 0 ? row[c.time] : null);
    const merchant = String(row[c.merchant] ?? "").trim();
    if (!when) { skipped += 1; continue; }
    const type = c.type >= 0 ? String(row[c.type] ?? "") : "";
    const words = `${type} ${merchant}`;
    let amount;
    if (c.out >= 0) {
      amount = toNumber(row[c.out]);
      if (!amount) { skipped += 1; continue; } // 출금 칸이 비었으면 입금 행
    } else {
      amount = toNumber(row[c.amount]);
    }
    if (!amount) { skipped += 1; continue; }
    const cancelled = CANCEL.test(words);
    if (!cancelled && NOT_SPEND.test(words)) { skipped += 1; continue; }
    if (bank && c.out < 0 && amount > 0 && !cancelled) { skipped += 1; continue; } // 은행 내역의 양수는 입금
    const kind = cancelled || (!bank && amount < 0) ? "refund" : "payment";
    const inst = c.install >= 0 ? String(row[c.install] ?? "").match(/(\d{1,2})/) : null;
    const name = merchant.replace(/\d{4,}/g, "").trim().slice(0, 40) || sourceById(sourceId)?.name || "지출";
    items.push({
      ts: when.ts, hasTime: when.hasTime, dateKey: when.dateKey, kind, amount: Math.abs(Math.round(amount)), merchant: name,
      installment: inst ? Number(inst[1]) : 0, sourceId, inputMode: "statement", pkg: "statement",
    });
  }
  return { items, skipped };
};

// 이미 있는 내역과 비교: 금액과 가맹점이 같고 시각이 1분 이내(내역에 시각이 없으면 같은 날).
// 알림의 가맹점 이름은 내역서와 조금 다를 수 있어 포함 관계도 같다고 본다.
const sameMerchant = (a, b) => {
  const x = normalizeMerchant(a);
  const y = normalizeMerchant(b);
  return x === y || (Math.min(x.length, y.length) >= 2 && (x.includes(y) || y.includes(x)));
};
const dayKey = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const isSameTx = (item, e) => {
  if (e.isDeleted || e.amount !== item.amount || e.kind !== item.kind || !sameMerchant(item.merchant, e.merchant)) return false;
  return item.hasTime ? Math.abs(e.ts - item.ts) <= 60000 : dayKey(e.ts) === item.dateKey;
};

export const planImport = (items, existing) => {
  const fresh = [];
  let duplicates = 0;
  items.forEach((item) => {
    if ([...existing, ...fresh].some((e) => isSameTx(item, e))) duplicates += 1;
    else fresh.push(item);
  });
  return { fresh, duplicates };
};

export const commitImport = async (fresh, { add }) => {
  for (const { hasTime, dateKey, ...item } of fresh) {
    await add("spendTx", { ...item, category: categoryFor(item) }, true);
  }
};

// 파일 → 표. 큰 라이브러리라 가져오기를 쓸 때만 불러온다.
export const readStatementFile = async (file) => {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return { error: "PDF는 표를 정확히 읽을 수 없습니다. 카드사·은행 앱이나 웹에서 엑셀 또는 CSV로 받아 주세요." };
  const buffer = await file.arrayBuffer();
  const XLSX = await import("xlsx");
  try {
    let book;
    if (name.endsWith(".csv")) {
      // 국내 금융사 CSV 는 EUC-KR 이 많다. UTF-8 로 읽어 깨지면 다시 읽는다.
      let text = new TextDecoder("utf-8").decode(buffer);
      if (text.includes("�")) text = new TextDecoder("euc-kr").decode(buffer);
      book = XLSX.read(text.replace(/^﻿/, ""), { type: "string", raw: true });
    } else {
      book = XLSX.read(buffer, { type: "array" });
    }
    const sheet = book.Sheets[book.SheetNames[0]];
    return { rows: XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: true }) };
  } catch (e) {
    if (/password|encrypt/i.test(e?.message || "")) return { error: "암호가 걸린 파일입니다. 암호를 푼 파일로 저장해 다시 올려 주세요." };
    return { error: "파일을 읽지 못했습니다. 엑셀(xlsx·xls) 또는 CSV 파일인지 확인해 주세요." };
  }
};
