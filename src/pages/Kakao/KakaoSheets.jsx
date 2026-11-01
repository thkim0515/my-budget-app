import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useTheme } from "styled-components";
import { pushBackHandler } from "../../utils/backHandlerStack";
import { useFormattedNumberInput } from "../../hooks/useFormattedNumberInput";
import { formatNumber, unformatNumber } from "../../utils/numberFormat";
import { DEFAULT_CATEGORIES } from "../../constants/categories";
import { KIND_LABEL, toDateKey, adjustmentForRemaining, budgetSummary, netAt, splitNet } from "../../utils/kakaoStats";
import { loadNotiLog } from "../../utils/kakaoIngest";
import * as S from "./KakaoPage.styles";

// 바닥에서 올라오는 시트 — 카드 한도 시트와 같은 모양. 뒤로가기로 닫힌다.
export function Sheet({ title, onClose, children }) {
  const theme = useTheme();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => pushBackHandler(() => closeRef.current()), []);

  return ReactDOM.createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300 }}>
      <div
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480, maxHeight: "88vh", display: "flex", flexDirection: "column",
          background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, borderBottom: "none",
          borderTopLeftRadius: 20, borderTopRightRadius: 20, boxSizing: "border-box", overflow: "hidden",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: theme.borderStrong, margin: "10px auto 0", flexShrink: 0 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 18px 6px", flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{title}</h3>
          <button type="button" aria-label="닫기" onClick={onClose} style={{ width: 44, height: 44, margin: "-8px -12px -8px 0", border: "none", background: "transparent", color: theme.subText, fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", overscrollBehavior: "contain", padding: "6px 18px calc(20px + env(safe-area-inset-bottom))" }}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function MoneyField({ label, value, onChange, placeholder }) {
  const input = useFormattedNumberInput({ onChange });
  return (
    <S.Field>
      {label}
      <input inputMode="numeric" autoComplete="off" value={value} placeholder={placeholder} onChange={input.onChange} />
    </S.Field>
  );
}

const CATEGORY_OPTIONS = [...new Set([...DEFAULT_CATEGORIES, "식비", "편의점", "배달", "쇼핑", "교통", "생활", "구독", "의료", "기타"])];

// 내역 추가·수정. tx 가 있으면 수정 모드.
export function TxSheet({ tx, onSave, onDelete, onClose }) {
  const [kind, setKind] = useState(tx?.kind || "payment");
  const [amount, setAmount] = useState(tx ? formatNumber(tx.amount) : "");
  const [merchant, setMerchant] = useState(tx?.merchant || "");
  const [category, setCategory] = useState(tx?.category || "기타");
  const [date, setDate] = useState(toDateKey(tx ? new Date(tx.ts) : new Date()));
  const [exclude, setExclude] = useState(!!tx?.excludeFromFlow);
  const amountValue = unformatNumber(amount);
  const isSpend = kind === "payment" || kind === "refund";
  const categories = CATEGORY_OPTIONS.includes(category) ? CATEGORY_OPTIONS : [category, ...CATEGORY_OPTIONS];

  const submit = () => {
    const [y, m, d] = date.split("-").map(Number);
    const today = toDateKey(new Date());
    // 시각을 따로 받지 않는다. 오늘은 지금, 다른 날은 원래 시각(수정)이나 정오로 둔다.
    let ts;
    if (tx && toDateKey(new Date(tx.ts)) === date) ts = tx.ts;
    else if (date === today) ts = Date.now();
    else ts = new Date(y, m - 1, d, 12).getTime();
    onSave({
      kind, amount: amountValue, merchant: merchant.trim() || KIND_LABEL[kind], ts, excludeFromFlow: exclude,
      category: kind === "income" ? "입금" : kind === "transfer" ? "이체" : category,
    });
  };

  return (
    <Sheet title={tx ? "내역 수정" : "내역 추가"} onClose={onClose}>
      <S.Segment style={{ marginBottom: 12 }}>
        {Object.entries(KIND_LABEL).map(([key, label]) => (
          <S.SegmentBtn key={key} type="button" $active={kind === key} onClick={() => setKind(key)}>{label}</S.SegmentBtn>
        ))}
      </S.Segment>
      <MoneyField label="금액(원)" value={amount} onChange={setAmount} placeholder="0" />
      <S.Field>
        {kind === "income" ? "입금처" : kind === "transfer" ? "받는 곳" : "가맹점"}
        <input value={merchant} maxLength={40} onChange={(e) => setMerchant(e.target.value)} />
      </S.Field>
      {isSpend && (
        <S.Field>
          카테고리
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </S.Field>
      )}
      <S.Field>
        날짜
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </S.Field>
      <S.CheckRow>
        <input type="checkbox" checked={exclude} onChange={(e) => setExclude(e.target.checked)} />
        자금 흐름 계산에서 제외(대출 실행·상환처럼 순자금이 안 변하는 내역)
      </S.CheckRow>
      <S.PrimaryBtn type="button" disabled={!amountValue} onClick={submit} style={{ marginTop: 8 }}>저장</S.PrimaryBtn>
      {tx && <S.GhostBtn type="button" $danger onClick={onDelete}>이 내역 삭제</S.GhostBtn>}
    </Sheet>
  );
}

// 자금 설정: 예산·잔액·마이너스 입력, 자동 인식, 가져오기.
export function FlowSheet({ flow, txs, onChange, onImport, onClose, onShowLog }) {
  const now = new Date();
  const net = netAt(txs, flow, now.getTime());
  const split = net == null ? null : splitNet(net, flow);
  const summary = budgetSummary(txs, flow, now);
  const [monthly, setMonthly] = useState(flow.monthlyBudget ? formatNumber(flow.monthlyBudget) : "");
  const [remaining, setRemaining] = useState(summary.hasBudget ? formatNumber(Math.max(summary.remaining, 0)) : "");
  const [balance, setBalance] = useState(split ? formatNumber(split.balance) : "");
  const [used, setUsed] = useState(split ? formatNumber(split.used) : "");
  const [limit, setLimit] = useState(flow.limit ? formatNumber(flow.limit) : "");

  const save = () => {
    const next = { ...flow, monthlyBudget: unformatNumber(monthly), limit: unformatNumber(limit) };
    // 남은 예산을 손댄 경우에만 이번 달 보정값을 다시 잡는다.
    const remainingValue = unformatNumber(remaining);
    const prevMonthly = flow.monthlyBudget || 0;
    if (remaining !== "" && (remainingValue !== Math.max(summary.remaining, 0) || !summary.hasBudget)) {
      next.budgetAdjust = adjustmentForRemaining(txs, next, remainingValue, now);
      next.budgetAdjustYm = summary.ym;
    } else if (next.monthlyBudget !== prevMonthly) {
      next.budgetAdjust = 0;
      next.budgetAdjustYm = "";
    }
    // 잔액·사용액을 바꿨거나 처음 넣을 때만 기준 시점을 새로 잡는다.
    const b = unformatNumber(balance);
    const u = unformatNumber(used);
    const changed = !split ? balance !== "" || used !== "" : b !== split.balance || u !== split.used;
    if (changed) {
      next.anchorNet = b - u;
      next.anchorLoan = b > 0 ? u : 0; // 잔액과 사용액이 함께 있으면 별도 대출(비상금대출)로 본다.
      next.anchorAt = now.getTime();
    }
    onChange(next);
    onClose();
  };

  return (
    <Sheet title="카카오뱅크 자금 설정" onClose={onClose}>
      <S.Caption style={{ marginBottom: 12 }}>이 탭은 내 돈 관리용입니다. 잔액·마이너스·예산과 입금·이체까지 따라갑니다. 지출만 모아 분석하는 곳은 전체 소비 탭입니다.</S.Caption>
      <S.CardTitle>이번 달 예산</S.CardTitle>
      <MoneyField label="매달 예산(원)" value={monthly} onChange={setMonthly} placeholder="예: 1,000,000" />
      <MoneyField label="지금 남은 예산(원) — 이번 달만 맞춤" value={remaining} onChange={setRemaining} placeholder="직접 넣으면 이 값부터 결제가 차감돼요" />
      <S.Divider />
      <S.CardTitle>현재 자금</S.CardTitle>
      <S.Caption style={{ marginBottom: 10 }}>지금 카카오뱅크 앱에 보이는 값을 넣으면, 이후 결제·입금을 반영해 따라갑니다. 어긋나면 언제든 다시 넣으세요.</S.Caption>
      <MoneyField label="통장 잔액(원)" value={balance} onChange={setBalance} placeholder="0" />
      <MoneyField label="마이너스(비상금대출) 사용액(원)" value={used} onChange={setUsed} placeholder="0" />
      <MoneyField label="마이너스(비상금대출) 한도(원)" value={limit} onChange={setLimit} placeholder="0" />
      <S.PrimaryBtn type="button" onClick={save}>저장</S.PrimaryBtn>
      <S.Divider />
      <S.CheckRow>
        <input type="checkbox" checked={flow.autoSave} onChange={(e) => onChange({ ...flow, autoSave: e.target.checked })} />
        이 탭에서 카카오뱅크 알림 자동 인식(잔액 계산용)
      </S.CheckRow>
      <S.GhostBtn type="button" onClick={onShowLog}>알림 인식 기록 보기</S.GhostBtn>
      <S.GhostBtn type="button" onClick={onImport}>가계부의 기존 카카오뱅크 내역 가져오기</S.GhostBtn>
    </Sheet>
  );
}

export function NotiLogSheet({ onClose }) {
  const log = loadNotiLog();
  return (
    <Sheet title="알림 인식 기록" onClose={onClose}>
      <S.Caption style={{ marginBottom: 10 }}>최근 카카오뱅크 알림 30건입니다. 이 기기에만 저장됩니다. 결제인데 저장되지 않았다면 내역 추가로 넣어 주세요.</S.Caption>
      {log.length === 0 && <S.Caption>아직 받은 카카오뱅크 알림이 없습니다.</S.Caption>}
      {log.map((row, i) => (
        <S.Detail key={`${row.time}-${i}`} style={{ marginTop: 8 }}>
          <S.Row>
            <strong style={{ fontSize: 13 }}>{row.status}</strong>
            <S.Caption>{new Date(row.time).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</S.Caption>
          </S.Row>
          <S.Caption style={{ marginTop: 4, overflowWrap: "anywhere" }}>{row.title} · {row.text}</S.Caption>
        </S.Detail>
      ))}
    </Sheet>
  );
}
