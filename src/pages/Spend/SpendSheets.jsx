import { useEffect, useMemo, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { BudgetPlugin } from "../../plugins/BudgetPlugin";
import { useFormattedNumberInput } from "../../hooks/useFormattedNumberInput";
import { formatNumber, unformatNumber } from "../../utils/numberFormat";
import { ALL_PACKAGES, SOURCES, sourceById } from "../../utils/spendParser";
import { loadSelectedSources, saveSelectedSources } from "../../utils/spendStore";
import { commitImport, parseStatementRows, planImport, readStatementFile } from "../../utils/statementImport";
import CategoryField from "../../components/UI/CategoryPicker";
import { forgetMerchantCategory, loadMerchantRuleList, rememberMerchantCategory } from "../../utils/kakaoIngest";
import { acceptSuggestionEverywhere, applyCategoryToSame, groupByMerchant, normalizeMerchant, hasRawConsent, sameMerchantMessage, parseRawWithClaude, tidyWithClaude, undoAutoCategory } from "../../utils/spendClassify";
import { formatTokens, formatUsd } from "../../utils/claudeClient";
import { won } from "../Kakao/KakaoCharts";
import { formatWhen as shortWhen } from "../../utils/kakaoStats";
import { Sheet } from "../Kakao/KakaoSheets";
import * as S from "../Kakao/KakaoPage.styles";

const KINDS = [["payment", "결제"], ["refund", "결제 취소"]];
const RECOMMENDED = ["kakaobank", "samsung"];

const pad = (n) => String(n).padStart(2, "0");
const toLocalInput = (ts) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// 알림을 읽을 금융사 선택. 추천·설치된 앱을 위로 올리되, 앱 없이 문자로만 받는 곳도 고를 수 있게 전부 보여 준다.
export function SourcesSheet({ onChange, onImport, onImportFile, onClose }) {
  const [selected, setSelected] = useState(loadSelectedSources);
  const [installed, setInstalled] = useState(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    BudgetPlugin.getInstalledPackages({ packages: ALL_PACKAGES }).then((r) => setInstalled(r.packages || [])).catch(() => setInstalled(null));
  }, []);

  const isInstalled = (s) => !!installed && s.packages.some((p) => installed.includes(p));
  const rank = (s) => (RECOMMENDED.includes(s.id) ? 2 : isInstalled(s) ? 1 : 0);
  const ordered = [...SOURCES].sort((a, b) => rank(b) - rank(a));
  const toggle = (id) => {
    const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
    setSelected(next);
    saveSelectedSources(next);
    onChange(next);
  };

  return (
    <Sheet title="지출을 모을 금융사" onClose={onClose}>
      <S.Caption style={{ marginBottom: 8 }}>
        체크한 곳의 앱 알림과, 그 이름이 들어 있는 문자·알림톡에서 사용한 금액만 모읍니다. 입금·이체·대출·잔액은 모으지 않습니다. 체크를 해제하면 이미 모은 내역도 이 탭에서 빠지고, 다시 체크하면 돌아옵니다(지워지지 않음). 잔액과 마이너스 관리는 카카오뱅크 탭에서 따로 합니다.
      </S.Caption>
      {ordered.map((s) => (
        <S.CheckRow key={s.id}>
          <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)} />
          <span style={{ flex: 1 }}>{s.name}{RECOMMENDED.includes(s.id) && <S.Badge>추천</S.Badge>}</span>
          {isInstalled(s) && <S.Caption>설치됨</S.Caption>}
        </S.CheckRow>
      ))}
      <S.GhostBtn type="button" onClick={onImportFile}>거래내역 파일 가져오기</S.GhostBtn>
      <S.GhostBtn type="button" onClick={onImport}>가계부의 기존 내역 가져오기(체크한 곳)</S.GhostBtn>
    </Sheet>
  );
}

// 거래내역 파일: 금융사 고르기 → 파일 → 미리보기 → 합치기.
export function ImportSheet({ existing, helpers, onDone, onClose }) {
  const [sourceId, setSourceId] = useState(loadSelectedSources()[0] || "kakaobank");
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    setError("");
    setPlan(null);
    const read = await readStatementFile(file);
    const parsed = read.error ? read : parseStatementRows(read.rows, sourceId);
    setBusy(false);
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    if (parsed.items.length === 0) {
      setError("지출 내역을 찾지 못했습니다. 다른 금융사를 고른 건 아닌지 확인해 주세요.");
      return;
    }
    const { fresh, duplicates } = planImport(parsed.items, existing);
    const times = parsed.items.map((t) => t.ts);
    setPlan({ fresh, duplicates, skipped: parsed.skipped, from: Math.min(...times), to: Math.max(...times), name: file.name });
  };

  const commit = async () => {
    setBusy(true);
    await commitImport(plan.fresh, helpers);
    setBusy(false);
    onDone(plan.fresh.length);
  };

  const day = (ts) => new Date(ts).toLocaleDateString("ko-KR");

  return (
    <Sheet title="거래내역 파일 가져오기" onClose={onClose}>
      <S.Caption style={{ marginBottom: 10 }}>
        알림을 받기 전 기간도 분석할 수 있게 합칩니다. 지출만 가져오고 잔액·계좌번호·카드번호 칸은 읽지 않습니다. 엑셀(xlsx·xls)과 CSV를 읽을 수 있습니다. PDF와 암호 걸린 파일은 읽지 못합니다.
      </S.Caption>
      <S.Field>
        금융사
        <select value={sourceId} onChange={(e) => { setSourceId(e.target.value); setPlan(null); }}>
          {[...SOURCES].sort((a, b) => Number(RECOMMENDED.includes(b.id)) - Number(RECOMMENDED.includes(a.id))).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </S.Field>
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls,.pdf" style={{ display: "none" }} onChange={onFile} aria-label="거래내역 파일" />
      <S.GhostBtn type="button" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? "읽는 중…" : "파일 고르기"}</S.GhostBtn>
      {error && <S.Detail><S.Caption>{error}</S.Caption></S.Detail>}
      {plan && (
        <S.Detail>
          <strong style={{ fontSize: 14 }}>{plan.name}</strong>
          <S.Caption style={{ marginTop: 4 }}>{day(plan.from)} ~ {day(plan.to)}</S.Caption>
          <S.Caption>새 지출 {plan.fresh.length}건 · 이미 있는 내역 {plan.duplicates}건 · 지출이 아니거나 읽지 못한 행 {plan.skipped}건</S.Caption>
          <S.PrimaryBtn type="button" style={{ marginTop: 10 }} disabled={busy || plan.fresh.length === 0} onClick={commit}>{plan.fresh.length}건 합치기</S.PrimaryBtn>
        </S.Detail>
      )}
    </Sheet>
  );
}

// 추가·수정·미분류 확인. tx 는 수정 대상, draft 는 미분류 알림에서 넘어온 초기값, raw 는 기기에만 있는 알림 원문.
// 카카오뱅크 탭과 공유하는 내역은 잔액 계산이 어긋나지 않게 가맹점·카테고리만 고칠 수 있다.
export function SpendTxSheet({ tx, draft, raw, onSave, onDelete, onClose }) {
  const initial = tx || draft || {};
  const editing = !!tx;
  const shared = tx?.store === "kakaoTx";
  const [sourceId, setSourceId] = useState(initial.sourceId || loadSelectedSources()[0] || SOURCES[0].id);
  const [kind, setKind] = useState(initial.kind === "refund" ? "refund" : "payment");
  const [amount, setAmount] = useState(initial.amount ? formatNumber(initial.amount) : "");
  const [merchant, setMerchant] = useState(initial.merchant || "");
  const [category, setCategory] = useState(initial.category || "기타");
  const [when, setWhen] = useState(toLocalInput(initial.ts || Date.now()));
  const [installment, setInstallment] = useState(String(initial.installment || 0));
  const amountInput = useFormattedNumberInput({ onChange: setAmount });
  const value = unformatNumber(amount);

  const submit = () => onSave(shared
    ? { merchant: merchant.trim() || tx.merchant, category }
    : {
      sourceId, kind, amount: value, merchant: merchant.trim() || sourceById(sourceId).name,
      category, ts: new Date(when).getTime() || Date.now(), installment: Number(installment) || 0,
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
      {tx?.autoCategory && (
        <S.Caption style={{ marginBottom: 10 }}>
          {tx.autoCategory.by === "rule" ? "이전 분류를 보고 앱이" : "Claude가"} 자동으로 정한 카테고리입니다. 고르면 다음부터 그 분류를 따릅니다.
        </S.Caption>
      )}
      {shared ? (
        <S.Caption style={{ marginBottom: 12 }}>카카오뱅크 탭과 함께 쓰는 내역입니다. 금액·일시·삭제는 잔액 계산과 이어져 있어 카카오뱅크 탭에서 고칩니다.</S.Caption>
      ) : (
        <>
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
        </>
      )}
      <S.Field>
        가맹점
        <input value={merchant} maxLength={40} onChange={(e) => setMerchant(e.target.value)} />
      </S.Field>
      <CategoryField label="카테고리" value={category} onChange={setCategory} />
      {!shared && (
        <S.Field>
          일시
          <input type="datetime-local" value={when} onChange={(e) => e.target.value && setWhen(e.target.value)} />
        </S.Field>
      )}
      {!shared && kind === "payment" && (
        <S.Field>
          할부(개월, 일시불은 0)
          <input inputMode="numeric" value={installment} onChange={(e) => setInstallment(e.target.value.replace(/[^0-9]/g, "").slice(0, 2))} />
        </S.Field>
      )}
      <S.PrimaryBtn type="button" disabled={!shared && !value} onClick={submit}>저장</S.PrimaryBtn>
      {onDelete && !shared && <S.GhostBtn type="button" $danger onClick={onDelete}>{draft ? "이 알림 버리기" : "이 내역 삭제"}</S.GhostBtn>}
    </Sheet>
  );
}

// 분류 정리: 읽지 못한 알림, Claude 추천 확인, 자동 적용 기록(되돌리기).
const clamp = { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" };

export function TidySheet({ hiddenCount = 0, onRestoreHidden, raws, suggestions, autoApplied, hasKey, helpers, onPick, onEdit, onDismiss, onChanged, onBulk, onOpenRules, onClose }) {
  const [opened, setOpened] = useState([]);
  const suggestionGroups = useMemo(() => groupByMerchant(suggestions), [suggestions]);
  const autoGroups = useMemo(() => groupByMerchant(autoApplied), [autoApplied]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const toggle = (key) => setOpened(opened.includes(key) ? opened.filter((x) => x !== key) : [...opened, key]);
  const describe = (r, parts) => `${parts}${r.tokens ? ` · 입력 ${formatTokens(r.tokens.input)} · 출력 ${formatTokens(r.tokens.output)} 토큰 · 약 ${formatUsd(r.usd)}` : ""}`;

  const runTidy = async () => {
    setBusy(true);
    const r = await tidyWithClaude(helpers);
    setBusy(false);
    setMessage(r.error || (r.skipped ? "정리할 내역이 없습니다." : describe(r, `자동 적용 ${r.applied}건 · 추천 ${r.suggested}건`)));
    onChanged();
  };
  const runRaw = async () => {
    setBusy(true);
    const r = await parseRawWithClaude(raws, helpers);
    setBusy(false);
    setMessage(r.error || describe(r, `지출로 저장 ${r.saved}건 · 확인 필요 ${r.suggested}건`));
    onChanged();
  };
  const accept = async (row, category) => {
    const r = await acceptSuggestionEverywhere(row, category, helpers);
    if (r.count > 0) onBulk({ message: sameMerchantMessage(category, r), undo: r.undo });
    onChanged();
  };
  const undoGroup = async (rows) => {
    for (const row of rows) await undoAutoCategory(row, helpers);
    onChanged();
  };

  return (
    <Sheet title="분류 정리" onClose={onClose}>
      {hasKey && <S.GhostBtn type="button" style={{ marginTop: 0 }} disabled={busy} onClick={runTidy}>{busy ? "정리하는 중…" : "기타 내역을 Claude로 정리"}</S.GhostBtn>}
      {message && <S.Caption style={{ marginTop: 8 }}>{message}</S.Caption>}
      {onOpenRules && <S.GhostBtn type="button" onClick={onOpenRules}>최근 분류 변경 보기·바꾸기</S.GhostBtn>}
      {hiddenCount > 0 && (
        <>
          <S.Caption style={{ marginTop: 8 }}>충전·이자·대출·안내 등 지출이 아닌 내역 {hiddenCount}건은 숨겼습니다(삭제 아님).</S.Caption>
          <S.GhostBtn type="button" onClick={onRestoreHidden}>숨긴 내역 모두 지출로 되돌리기</S.GhostBtn>
        </>
      )}

      <S.CardTitle style={{ marginTop: 16 }}>읽지 못한 알림 {raws.length}건</S.CardTitle>
      <S.Caption style={{ marginBottom: 6 }}>눌러서 고치면 지출로 저장됩니다. 원문은 이 기기에만 있습니다.</S.Caption>
      {hasKey && hasRawConsent() && raws.length > 0 && <S.GhostBtn type="button" disabled={busy} onClick={runRaw}>Claude로 읽기</S.GhostBtn>}
      {raws.map((n) => {
        const open = opened.includes(n.id);
        return (
          <S.Detail key={n.id} style={{ marginTop: 8, minWidth: 0 }}>
            <S.Row style={{ alignItems: "flex-start" }}>
              <strong style={{ fontSize: 14, overflowWrap: "anywhere", minWidth: 0 }}>{sourceById(n.sourceId)?.name} · {n.suggestion?.merchant || n.reason}</strong>
              <S.Caption style={{ flexShrink: 0 }}>{shortWhen(n.ts)}</S.Caption>
            </S.Row>
            {n.pkg && <S.Caption style={{ overflowWrap: "anywhere" }}>보낸 앱: {n.pkg}</S.Caption>}
            <S.Caption style={{ marginTop: 4, overflowWrap: "anywhere", wordBreak: "break-word", ...(open ? {} : clamp) }}>{n.title ? `${n.title} · ` : ""}{n.text}</S.Caption>
            <S.Row style={{ marginTop: 6 }}>
              <S.GhostBtn type="button" style={{ marginTop: 0 }} onClick={() => setOpened(open ? opened.filter((x) => x !== n.id) : [...opened, n.id])}>{open ? "접기" : "전체 보기"}</S.GhostBtn>
              <S.GhostBtn type="button" style={{ marginTop: 0 }} onClick={() => onPick(n)}>지출로 입력</S.GhostBtn>
              <S.GhostBtn type="button" $danger style={{ marginTop: 0 }} onClick={() => onDismiss(n)}>삭제</S.GhostBtn>
            </S.Row>
          </S.Detail>
        );
      })}

      <S.CardTitle style={{ marginTop: 16 }}>Claude 추천 {suggestions.length}건</S.CardTitle>
      {suggestions.length === 0 && <S.Caption>확인할 추천이 없습니다.</S.Caption>}
      {suggestionGroups.map(({ key, rows }) => {
        const t = rows[0];
        const open = opened.includes(key);
        return (
          <S.Detail key={key} style={{ marginTop: 8 }}>
            <S.Row>
              <strong style={{ fontSize: 14, overflowWrap: "anywhere" }}>{t.merchant}{rows.length > 1 ? ` · ${rows.length}건` : ""}</strong>
              <S.Caption style={{ flexShrink: 0 }}>{shortWhen(t.ts)}</S.Caption>
            </S.Row>
            <S.Caption style={{ margin: "6px 0" }}>추천: {t.suggestedCategory} (확신 {Math.round((t.suggestedConfidence || 0) * 100)}%)</S.Caption>
            <CategoryField compact value={t.suggestedCategory} onChange={(c) => accept(t, c)} />
            <S.GhostBtn type="button" onClick={() => accept(t, t.suggestedCategory)}>{t.suggestedCategory}(으)로 정하기{rows.length > 1 ? ` (${rows.length}건)` : ""}</S.GhostBtn>
            {rows.length > 1 && <S.GhostBtn type="button" onClick={() => toggle(key)}>{open ? "접기" : "내역 펼치기"}</S.GhostBtn>}
            {open && rows.map((r) => <S.Caption key={`${r.store}-${r.id}`}>{shortWhen(r.ts)} · {won(r.amount)}</S.Caption>)}
            <S.GhostBtn type="button" onClick={() => onEdit(t)}>가맹점·금액 직접 수정</S.GhostBtn>
          </S.Detail>
        );
      })}

      <S.CardTitle style={{ marginTop: 16 }}>자동 적용 {autoApplied.length}건</S.CardTitle>
      {autoApplied.length === 0 && <S.Caption>자동으로 바꾼 내역이 없습니다.</S.Caption>}
      {autoGroups.slice(0, 30).map(({ key, rows }) => {
        const t = rows[0];
        return (
          <S.Detail key={key} style={{ marginTop: 8, minWidth: 0 }}>
            <strong style={{ display: "block", fontSize: 14, overflowWrap: "anywhere" }}>{t.merchant} → {t.category}{rows.length > 1 ? ` · ${rows.length}건` : ""}</strong>
            <S.Caption>{t.autoCategory.by === "rule" ? "이전 분류와 비교" : `Claude 확신 ${Math.round(t.autoCategory.confidence * 100)}%`} · {shortWhen(t.ts)}</S.Caption>
            <S.Row style={{ marginTop: 6 }}>
              <S.GhostBtn type="button" style={{ marginTop: 0 }} onClick={() => onEdit(t)}>수정</S.GhostBtn>
              <S.GhostBtn type="button" style={{ marginTop: 0 }} onClick={() => undoGroup(rows)}>되돌리기</S.GhostBtn>
            </S.Row>
          </S.Detail>
        );
      })}
    </Sheet>
  );
}

// 최근 분류 변경: 직접 정했거나 일괄 적용된 가맹점→카테고리 규칙. 행에서 바로 바꾸면 규칙 갱신 + 같은 이름 내역 일괄 변경(되돌리기 가능).
export function RulesSheet({ txs, helpers, onBulk, onClose }) {
  const [rules, setRules] = useState(loadMerchantRuleList);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const refresh = () => setRules(loadMerchantRuleList());
    window.addEventListener("budget-db-updated", refresh);
    return () => window.removeEventListener("budget-db-updated", refresh);
  }, []);
  const counts = useMemo(() => {
    const m = new Map();
    txs.forEach((t) => { const k = normalizeMerchant(t.merchant); m.set(k, (m.get(k) || 0) + 1); });
    return m;
  }, [txs]);
  const q = query.trim().toLowerCase();
  const shown = rules.filter((r) => !q || r.merchant.toLowerCase().includes(q));

  const change = async (rule, category) => {
    if (category === rule.category) return;
    const prev = rule.category;
    rememberMerchantCategory(rule.merchant, category);
    const r = await applyCategoryToSame({ merchant: rule.merchant }, category, helpers);
    setRules(loadMerchantRuleList());
    onBulk({
      message: `'${rule.merchant}' 규칙을 '${category}'로 바꿨어요${r.count > 0 ? ` · 같은 이름 ${r.count}건도 변경` : ""}`,
      undo: async () => { await r.undo(); rememberMerchantCategory(rule.merchant, prev); },
    });
  };
  const remove = (rule) => {
    if (!window.confirm(`'${rule.merchant}' 규칙을 지울까요? 이미 바뀐 내역은 그대로 두고, 이 가맹점은 앞으로 자동 분류하지 않습니다.`)) return;
    forgetMerchantCategory(rule.merchant);
    setRules(loadMerchantRuleList());
  };

  return (
    <Sheet title="최근 분류 변경" onClose={onClose}>
      <S.Caption style={{ marginBottom: 10 }}>직접 정했거나 한꺼번에 바꾼 가맹점의 분류입니다. 카테고리를 바꾸면 같은 이름의 내역도 모두 바뀝니다.</S.Caption>
      <S.Field style={{ marginBottom: 8 }}>
        <input type="search" placeholder="가맹점 검색" aria-label="가맹점 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
      </S.Field>
      {rules.length === 0 && <S.Caption>아직 정한 분류가 없습니다. 내역의 카테고리를 바꾸면 여기에 쌓입니다.</S.Caption>}
      {rules.length > 0 && shown.length === 0 && <S.Caption>검색 결과가 없습니다.</S.Caption>}
      {shown.map((rule) => (
        <S.Detail key={rule.merchant} style={{ marginTop: 8, minWidth: 0 }}>
          <strong style={{ display: "block", fontSize: 14, overflowWrap: "anywhere" }}>{rule.merchant}</strong>
          <S.Caption style={{ margin: "2px 0 8px" }}>내역 {counts.get(normalizeMerchant(rule.merchant)) || 0}건 · {rule.at ? shortWhen(rule.at) : "날짜 기록 없음"}</S.Caption>
          <CategoryField compact value={rule.category} onChange={(c) => change(rule, c)} />
          <button type="button" onClick={() => remove(rule)} style={{ minHeight: 44, marginTop: 2, padding: "0 4px", border: "none", background: "none", color: "inherit", opacity: 0.75, fontSize: 13, textDecoration: "underline", cursor: "pointer" }}>규칙 삭제 · 자동 분류에서 제외</button>
        </S.Detail>
      ))}
    </Sheet>
  );
}
