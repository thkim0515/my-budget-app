import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { BudgetPlugin } from "../../plugins/BudgetPlugin";
import { useFormattedNumberInput } from "../../hooks/useFormattedNumberInput";
import { formatNumber, unformatNumber } from "../../utils/numberFormat";
import { ALL_PACKAGES, SOURCES, sourceById } from "../../utils/spendParser";
import { loadSelectedSources, saveSelectedSources } from "../../utils/spendStore";
import { Sheet } from "../Kakao/KakaoSheets";
import * as S from "../Kakao/KakaoPage.styles";

const CATEGORIES = ["식비", "편의점", "배달", "쇼핑", "교통", "생활", "구독", "의료", "기타"];
const KINDS = [["payment", "결제"], ["refund", "결제 취소"], ["transfer", "이체"]];

const pad = (n) => String(n).padStart(2, "0");
const toLocalInput = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// 알림을 읽을 금융사 선택. 설치된 앱을 위로 올리되, 앱 없이 문자로만 받는 곳도 고를 수 있게 전부 보여 준다.
export function SourcesSheet({ onImport, onClose }) {
  const [selected, setSelected] = useState(loadSelectedSources);
  const [installed, setInstalled] = useState(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    BudgetPlugin.getInstalledPackages({ packages: ALL_PACKAGES }).then((r) => setInstalled(r.packages || [])).catch(() => setInstalled(null));
  }, []);

  const isInstalled = (s) => !!installed && s.packages.some((p) => installed.includes(p));
  const ordered = [...SOURCES].sort((a, b) => Number(isInstalled(b)) - Number(isInstalled(a)));
  const toggle = (id) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    saveSelectedSources(next);
  };

  return (
    <Sheet title="알림 읽을 금융사" onClose={onClose}>
      <S.Caption style={{ marginBottom: 8 }}>
        체크한 곳의 앱 알림과, 그 이름이 들어 있는 문자·알림톡만 읽습니다. 카드 승인이 문자로 오는 곳은 앱이 없어도 체크해 주세요. 카카오뱅크는 카카오뱅크 탭의 자동 인식과 같은 설정입니다.
      </S.Caption>
      {ordered.map((s) => (
        <S.CheckRow key={s.id}>
          <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
          <span style={{ flex: 1 }}>{s.name}</span>
          {isInstalled(s) && <S.Caption>설치됨</S.Caption>}
        </S.CheckRow>
      ))}
      <S.GhostBtn type="button" onClick={onImport}>가계부의 기존 내역 가져오기(체크한 곳)</S.GhostBtn>
    </Sheet>
  );
}

// 추가·수정·미분류 확인. tx 는 수정 대상, draft 는 미분류 알림에서 넘어온 초기값, raw 는 기기에만 있는 알림 원문.
export function SpendTxSheet({ tx, draft, raw, onSave, onDelete, onClose }) {
  const initial = tx || draft || {};
  const editing = !!tx;
  const [sourceId, setSourceId] = useState(initial.sourceId || loadSelectedSources()[0] || SOURCES[0].id);
  const [kind, setKind] = useState(initial.kind === "income" ? "payment" : initial.kind || "payment");
  const [amount, setAmount] = useState(initial.amount ? formatNumber(initial.amount) : "");
  const [merchant, setMerchant] = useState(initial.merchant || "");
  const [category, setCategory] = useState(initial.category && initial.category !== "이체" ? initial.category : "기타");
  const [when, setWhen] = useState(toLocalInput(initial.ts || Date.now()));
  const [installment, setInstallment] = useState(String(initial.installment || 0));
  const amountInput = useFormattedNumberInput({ onChange: setAmount });
  const value = unformatNumber(amount);
  const categories = CATEGORIES.includes(category) ? CATEGORIES : [category, ...CATEGORIES];

  const submit = () => onSave({
    sourceId, kind, amount: value, merchant: merchant.trim() || sourceById(sourceId).name,
    category: kind === "transfer" ? "이체" : category, ts: new Date(when).getTime() || Date.now(), installment: Number(installment) || 0,
  });

  return (
    <Sheet title={editing ? "지출 수정" : draft ? "미분류 확인" : "지출 추가"} onClose={onClose}>
      {raw && (
        <S.Detail style={{ marginTop: 0, marginBottom: 12 }}>
          <S.Caption><strong>알림 원문(이 기기에만 저장)</strong></S.Caption>
          {raw.reason && <S.Caption>이유: {raw.reason}</S.Caption>}
          <S.Caption style={{ marginTop: 4, overflowWrap: "anywhere" }}>{raw.title} · {raw.text}</S.Caption>
        </S.Detail>
      )}
      <S.Segment style={{ marginBottom: 12 }}>
        {KINDS.map(([key, label]) => <S.SegmentBtn key={key} type="button" $active={kind === key} onClick={() => setKind(key)}>{label}</S.SegmentBtn>)}
      </S.Segment>
      <S.Field>
        출처
        <select value={sourceId} disabled={editing} onChange={(e) => setSourceId(e.target.value)}>
          {SOURCES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </S.Field>
      <S.Field>
        금액(원)
        <input inputMode="numeric" autoComplete="off" value={amount} placeholder="0" onChange={amountInput.onChange} />
      </S.Field>
      <S.Field>
        {kind === "transfer" ? "받는 곳" : "가맹점"}
        <input value={merchant} maxLength={40} onChange={(e) => setMerchant(e.target.value)} />
      </S.Field>
      {kind !== "transfer" && (
        <S.Field>
          카테고리
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </S.Field>
      )}
      <S.Field>
        일시
        <input type="datetime-local" value={when} onChange={(e) => e.target.value && setWhen(e.target.value)} />
      </S.Field>
      {kind === "payment" && (
        <S.Field>
          할부(개월, 일시불은 0)
          <input inputMode="numeric" value={installment} onChange={(e) => setInstallment(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} />
        </S.Field>
      )}
      <S.PrimaryBtn type="button" disabled={!value} onClick={submit}>저장</S.PrimaryBtn>
      {onDelete && <S.GhostBtn type="button" $danger onClick={onDelete}>{draft ? "이 알림 버리기" : "이 내역 삭제"}</S.GhostBtn>}
    </Sheet>
  );
}

export function UnclassifiedSheet({ items, onPick, onClose }) {
  return (
    <Sheet title={`미분류 알림 ${items.length}건`} onClose={onClose}>
      <S.Caption style={{ marginBottom: 8 }}>금액이나 내용을 읽지 못한 알림입니다. 눌러서 고치면 지출로 저장됩니다. 원문은 이 기기에만 있습니다.</S.Caption>
      {items.length === 0 && <S.Caption>확인할 알림이 없습니다.</S.Caption>}
      {items.map((n) => (
        <S.TxBtn key={n.id} type="button" onClick={() => onPick(n)}>
          <span>
            <strong>{sourceById(n.sourceId)?.name} · {n.reason}</strong>
            <small style={{ overflowWrap: "anywhere" }}>{new Date(n.ts).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })} · {n.text}</small>
          </span>
        </S.TxBtn>
      ))}
    </Sheet>
  );
}
