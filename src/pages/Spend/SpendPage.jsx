import { useCallback, useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { BudgetPlugin } from "../../plugins/BudgetPlugin";
import { useNavigate } from "react-router-dom";
import { useTheme } from "styled-components";
import Header from "../../components/UI/Header";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { byCategory, byMerchant, shiftYm, spendOf, toDateKey, toYm } from "../../utils/kakaoStats";
import { sourceById } from "../../utils/spendParser";
import { importSpendFromRecords, loadSelectedSources, mergeSpend } from "../../utils/spendStore";
import { bucketSeries, byBand, sourceBreakdown, compareCategories, inPeriod, monthPeriod, previousPeriod, rangePeriod, totalSpend } from "../../utils/spendStats";
import { rememberMerchantCategory, categoryFor } from "../../utils/kakaoIngest";
import { tidyLocal } from "../../utils/spendClassify";
import { CategoryDoughnut, SpendBars, categoryColor, won } from "../Kakao/KakaoCharts";
import * as S from "../Kakao/KakaoPage.styles";
import { ImportSheet, SourcesSheet, SpendTxSheet, TidySheet } from "./SpendSheets";
import ClaudePanel from "./ClaudePanel";
import SourceBreakdown, { RankBars } from "./SourceBreakdown";

const PAGE_SIZE = 50;
const formatWhen = (ts) => new Date(ts).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

function TxRows({ list, onEdit }) {
  const theme = useTheme();
  return list.map((tx) => {
    const positive = tx.kind === "refund";
    const label = tx.kind === "refund" ? "결제 취소" : tx.category;
    return (
      <S.TxBtn key={`${tx.store}-${tx.id}`} type="button" onClick={() => onEdit(tx)}>
        <span>
          <strong>{tx.merchant}</strong>
          <small>{sourceById(tx.sourceId)?.name} · {formatWhen(tx.ts)} · {label}{tx.installment > 0 ? ` · ${tx.installment}개월` : ""}{tx.autoCategory ? " · 자동 분류" : ""}{tx.suggestedCategory ? " · 추천 있음" : ""}</small>
        </span>
        <span style={{ color: positive ? theme.incomeColor : theme.text }}>{positive ? "+" : "-"}{won(tx.amount)}</span>
      </S.TxBtn>
    );
  });
}

export default function SpendPage() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { db, getAll, add, put, deleteItem } = useBudgetDB();
  const currentYm = toYm(new Date());
  const [spendTxs, setSpendTxs] = useState([]);
  const [kakaoTxs, setKakaoTxs] = useState([]);
  const [unclassified, setUnclassified] = useState([]);
  const [tab, setTab] = useState("stats");
  const [mode, setMode] = useState("month");
  const [ym, setYm] = useState(currentYm);
  const [rangeStart, setRangeStart] = useState(`${currentYm}-01`);
  const [rangeEnd, setRangeEnd] = useState(toDateKey(new Date()));
  const [unit, setUnit] = useState("day");
  const [selected, setSelected] = useState(null);
  const [activeSource, setActiveSource] = useState(null);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [tidyOpen, setTidyOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [editing, setEditing] = useState(null); // { tx?, draft?, raw? }
  const [selectedIds, setSelectedIds] = useState(loadSelectedSources);
  const selectedCount = selectedIds.length;

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    BudgetPlugin.hasClaudeApiKey().then((r) => setHasKey(!!r.exists)).catch(() => setHasKey(false));
  }, [tab, tidyOpen]);

  const reload = useCallback(async () => {
    if (!db) return;
    setSpendTxs(await getAll("spendTx"));
    setKakaoTxs(await getAll("kakaoTx"));
    const raws = await db.getAll("spendNoti");
    setUnclassified(raws.filter((n) => n.status === "unclassified").sort((a, b) => b.ts - a.ts));
  }, [db, getAll]);

  useEffect(() => {
    reload();
    window.addEventListener("budget-db-updated", reload);
    // 알림은 백그라운드 동기화로 조용히 들어오므로 화면을 켜 둔 동안 주기적으로 다시 읽는다.
    const timer = setInterval(() => document.visibilityState === "visible" && reload(), 20000);
    return () => {
      window.removeEventListener("budget-db-updated", reload);
      clearInterval(timer);
    };
  }, [reload]);

  const all = useMemo(() => mergeSpend(spendTxs, kakaoTxs, selectedIds), [spendTxs, kakaoTxs, selectedIds]);
  const suggestions = useMemo(() => all.filter((t) => t.suggestedCategory && !t.categoryLocked && t.category === "기타"), [all]);
  const autoApplied = useMemo(() => all.filter((t) => t.autoCategory).sort((a, b) => (b.autoCategory.at || 0) - (a.autoCategory.at || 0)), [all]);
  const tidyHelpers = { db, getAll, put, add };
  const reviewCount = unclassified.length + suggestions.length;
  const period = useMemo(() => (mode === "month" ? monthPeriod(ym) : rangePeriod(rangeStart, rangeEnd)), [mode, ym, rangeStart, rangeEnd]);
  const list = useMemo(() => inPeriod(all, period), [all, period]);
  const total = totalSpend(list);
  const prev = previousPeriod(period);
  const prevTotal = useMemo(() => totalSpend(inPeriod(all, prev)), [all, prev]);
  const buckets = useMemo(() => bucketSeries(all, period, unit), [all, period, unit]);
  const categories = useMemo(() => byCategory(list), [list]);
  const sources = useMemo(() => sourceBreakdown(list, selectedIds), [list, selectedIds]);
  const merchants = useMemo(() => byMerchant(list).slice(0, 10), [list]);
  const bands = useMemo(() => byBand(list), [list]);
  const categoryTotal = categories.reduce((acc, r) => acc + r.amount, 0);
  const compareRows = useMemo(() => compareCategories(list, inPeriod(all, prev)).slice(0, 5), [list, all, prev]);
  const selectedBucket = selected != null ? buckets[selected] : null;
  const bucketList = selectedBucket ? all.filter((t) => t.ts >= selectedBucket.from && t.ts < selectedBucket.to && spendOf(t) !== 0) : [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return list.filter((t) => (!sourceFilter || t.sourceId === sourceFilter)
      && (!categoryFilter || t.category === categoryFilter)
      && (!q || t.merchant.toLowerCase().includes(q)));
  }, [list, query, sourceFilter, categoryFilter]);
  const filterSources = useMemo(() => [...new Set(list.map((t) => t.sourceId))], [list]);
  const filterCategories = useMemo(() => [...new Set(list.map((t) => t.category).filter(Boolean))], [list]);

  const resetView = () => { setSelected(null); setShown(PAGE_SIZE); };

  const openTx = async (tx) => {
    const raws = db ? await db.getAll("spendNoti") : [];
    setEditing({ tx, raw: raws.find((n) => n.txId === tx.id) || null });
  };
  const openUnclassified = (n) => {
    setTidyOpen(false);
    const s = n.suggestion?.isExpense ? n.suggestion : {};
    setEditing({ draft: { sourceId: n.sourceId, ts: n.ts, merchant: s.merchant || "", amount: s.amount || 0, kind: s.kind }, raw: n });
  };

  const saveTx = async (fields) => {
    const { tx, draft, raw } = editing;
    if (tx) {
      // 사용자가 고른 분류는 규칙으로 배우고, 이후 자동으로 바꾸지 않는다.
      // Claude·앱이 자동으로 정한 내역을 저장하면 그대로 확인한 것으로 보고 같은 가맹점은 이 분류를 따른다.
      const changed = fields.category !== tx.category || fields.merchant !== tx.merchant || !!tx.autoCategory;
      if (changed && fields.category !== "기타") rememberMerchantCategory(fields.merchant, fields.category);
      const { store, sourceId: mergedSource, autoCategory, suggestedCategory, suggestedConfidence, ...rest } = tx;
      const keep = changed ? { categoryLocked: true } : { autoCategory, suggestedCategory, suggestedConfidence };
      const next = { ...rest, ...fields, ...Object.fromEntries(Object.entries(keep).filter(([, v]) => v !== undefined)) };
      await put(store, store === "kakaoTx" ? next : { sourceId: mergedSource, ...next });
      await tidyLocal({ getAll, put }); // 방금 배운 규칙을 같은 가맹점 미분류에 바로 적용한다
    } else {
      // 카카오뱅크로 직접 넣어도 ②의 잔액에 섞이지 않게 전체 소비 쪽에만 저장한다.
      const base = { ...fields, category: fields.category === "기타" ? categoryFor(fields) : fields.category, inputMode: draft ? "unclassified" : "manual", pkg: "" };
      const id = await add("spendTx", base);
      if (raw) await db.put("spendNoti", { ...raw, status: "parsed", txId: id });
    }
    setEditing(null);
    reload();
  };

  const dismissRaw = async (n) => {
    if (!window.confirm("이 알림을 지울까요? 지출로 저장되지 않습니다.")) return;
    await db.delete("spendNoti", n.id);
    reload();
  };

  const deleteEditing = async () => {
    const { tx, raw } = editing;
    if (tx) {
      if (!window.confirm("이 내역을 삭제할까요?")) return;
      await deleteItem(tx.store, tx.id);
    }
    if (raw) await db.delete("spendNoti", raw.id); // 원문은 복구할 일이 없어 실제로 지운다.
    setEditing(null);
    reload();
  };

  const closeSources = () => {
    setSourcesOpen(false);
    setSelectedIds(loadSelectedSources());
  };
  const importRecords = async () => {
    const count = await importSpendFromRecords({ getAll, add });
    window.dispatchEvent(new CustomEvent("budget-db-updated"));
    alert(count > 0 ? `${count}건을 가져왔습니다.` : "새로 가져올 내역이 없습니다.");
  };

  const diff = total - prevTotal;

  return (
    <S.Page>
      <Header title="전체 소비" onSettings={() => navigate("/settings")} rightButton={<S.AddBtn type="button" onClick={() => setEditing({})}>＋ 추가</S.AddBtn>} />
      <S.Body>
        {selectedCount === 0 && (
          <S.Card>
            <S.CardTitle>어느 곳의 지출을 모을까요?</S.CardTitle>
            <S.Caption>체크한 은행·카드에서 사용한 금액만 모아 분석합니다. 잔액과 마이너스는 카카오뱅크 탭에서 따로 관리합니다.</S.Caption>
            <S.GhostBtn type="button" onClick={() => setSourcesOpen(true)}>금융사 선택</S.GhostBtn>
          </S.Card>
        )}
        {reviewCount > 0 && (
          <S.GhostBtn type="button" style={{ marginTop: 0, background: theme.warningSoft, border: "none" }} onClick={() => setTidyOpen(true)}>
            확인이 필요한 분류 {reviewCount}건
          </S.GhostBtn>
        )}

        <S.Card>
          <S.Row style={{ marginBottom: 8 }}>
            <S.Segment style={{ flex: 1 }}>
              <S.SegmentBtn type="button" $active={mode === "month"} onClick={() => { setMode("month"); resetView(); }}>월</S.SegmentBtn>
              <S.SegmentBtn type="button" $active={mode === "range"} onClick={() => { setMode("range"); resetView(); }}>기간 지정</S.SegmentBtn>
            </S.Segment>
            <S.AddBtn type="button" onClick={() => setSourcesOpen(true)} style={{ minHeight: 40, background: theme.primarySoft, color: theme.primaryText }}>금융사 {selectedCount}곳</S.AddBtn>
          </S.Row>
          {mode === "month" ? (
            <S.MonthNav>
              <S.IconBtn type="button" aria-label="이전 달" onClick={() => { setYm(shiftYm(ym, -1)); resetView(); }}>‹</S.IconBtn>
              <strong>{period.label}</strong>
              <S.IconBtn type="button" aria-label="다음 달" disabled={ym >= currentYm} onClick={() => { setYm(shiftYm(ym, 1)); resetView(); }}>›</S.IconBtn>
            </S.MonthNav>
          ) : (
            <S.Stats style={{ marginTop: 0 }}>
              <S.Field style={{ margin: 0 }}>시작일<input type="date" value={rangeStart} onChange={(e) => { if (e.target.value) { setRangeStart(e.target.value); resetView(); } }} /></S.Field>
              <S.Field style={{ margin: 0 }}>종료일<input type="date" value={rangeEnd} onChange={(e) => { if (e.target.value) { setRangeEnd(e.target.value); resetView(); } }} /></S.Field>
            </S.Stats>
          )}
        </S.Card>

        <S.Hero>
          <S.HeroLabel $onHero>{mode === "month" ? `${new Date(period.from).getMonth() + 1}월에` : "이 기간에"} 사용한 금액</S.HeroLabel>
          <S.HeroValue $onHero>{won(total)}</S.HeroValue>
          <S.HeroNote>
            {prevTotal > 0 ? `직전 기간보다 ${won(Math.abs(diff))} ${diff > 0 ? "더 씀" : "덜 씀"}` : "직전 기간 내역 없음"}
          </S.HeroNote>
        </S.Hero>

        <S.Segment role="tablist">
          {[["stats", "기본 분석"], ["list", "내역"], ["claude", "Claude 분석"]].map(([key, label]) => (
            <S.SegmentBtn key={key} type="button" role="tab" aria-selected={tab === key} $active={tab === key} onClick={() => setTab(key)}>{label}</S.SegmentBtn>
          ))}
        </S.Segment>

        {tab === "stats" && (
          <>
            <S.Card>
              <S.Segment style={{ marginBottom: 12 }}>
                {[["day", "일별"], ["week", "주별"], ["month", "월별"]].map(([key, label]) => (
                  <S.SegmentBtn key={key} type="button" $active={unit === key} onClick={() => { setUnit(key); setSelected(null); }}>{label}</S.SegmentBtn>
                ))}
              </S.Segment>
              <SpendBars rows={buckets} selected={selected} onSelect={setSelected} />
              {selectedBucket ? (
                <S.Detail>
                  <S.Row>
                    <strong style={{ fontSize: 14 }}>{selectedBucket.title}</strong>
                    <strong style={{ fontSize: 15 }}>{won(selectedBucket.spend)}</strong>
                  </S.Row>
                  {bucketList.length > 0 && <div style={{ marginTop: 8 }}><TxRows list={bucketList.slice(0, 30)} onEdit={openTx} /></div>}
                  {bucketList.length > 30 && <S.Caption>외 {bucketList.length - 30}건</S.Caption>}
                </S.Detail>
              ) : <S.Caption style={{ marginTop: 10 }}>막대를 누르면 그 기간의 내역을 볼 수 있습니다.</S.Caption>}
            </S.Card>
            <SourceBreakdown rows={sources} list={list} period={period} activeId={activeSource} onPick={setActiveSource} />
            <S.Card>
              <S.CardTitle>카테고리별</S.CardTitle>
              {categories.length > 0 && <CategoryDoughnut rows={categories} />}
              <div style={{ marginTop: 10 }}>
                {categories.length === 0 && <S.Caption>결제 내역이 없습니다.</S.Caption>}
                {categories.map((r) => (
                  <S.RankRow key={r.name}>
                    <div>
                      <span><S.Dot $color={categoryColor(r.name, theme)} />{r.name} · {Math.round((r.amount / categoryTotal) * 100)}%</span>
                      <span>{won(r.amount)}</span>
                    </div>
                  </S.RankRow>
                ))}
              </div>
            </S.Card>
            <S.Card>
              <S.CardTitle>가맹점 상위 10곳</S.CardTitle>
              <RankBars rows={merchants} />
            </S.Card>
            <S.Card>
              <S.CardTitle>시간대별</S.CardTitle>
              <RankBars rows={bands.filter((b) => b.amount > 0).sort((a, b) => b.amount - a.amount)} />
            </S.Card>
            {prevTotal > 0 && (
              <S.Card>
                <S.CardTitle>직전 기간 대비 많이 달라진 곳</S.CardTitle>
                {compareRows.map((r) => (
                  <S.RankRow key={r.name}>
                    <div>
                      <span>{r.name}</span>
                      <S.Delta $up={r.diff > 0}>{r.diff > 0 ? "+" : "-"}{won(Math.abs(r.diff))}</S.Delta>
                    </div>
                  </S.RankRow>
                ))}
              </S.Card>
            )}
          </>
        )}

        {tab === "list" && (
          <S.Card>
            <S.Field>
              가맹점 검색
              <input value={query} placeholder="예: 쿠팡" onChange={(e) => { setQuery(e.target.value); setShown(PAGE_SIZE); }} />
            </S.Field>
            <S.Stats style={{ marginTop: 0, marginBottom: 8 }}>
              <S.Field style={{ margin: 0 }}>
                출처
                <select value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setShown(PAGE_SIZE); }}>
                  <option value="">전체</option>
                  {filterSources.map((id) => <option key={id} value={id}>{sourceById(id)?.name}</option>)}
                </select>
              </S.Field>
              <S.Field style={{ margin: 0 }}>
                카테고리
                <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setShown(PAGE_SIZE); }}>
                  <option value="">전체</option>
                  {filterCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </S.Field>
            </S.Stats>
            <S.Caption style={{ marginBottom: 6 }}>{filtered.length}건 · 합계 {won(totalSpend(filtered))}</S.Caption>
            {filtered.length === 0 && <S.Caption>조건에 맞는 내역이 없습니다.</S.Caption>}
            <TxRows list={filtered.slice(0, shown)} onEdit={openTx} />
            {filtered.length > shown && <S.GhostBtn type="button" onClick={() => setShown(shown + PAGE_SIZE)}>더 보기</S.GhostBtn>}
          </S.Card>
        )}

        {tab === "claude" && <ClaudePanel txs={all} period={period} helpers={tidyHelpers} onChanged={reload} />}
      </S.Body>
      {sourcesOpen && <SourcesSheet onImport={importRecords} onImportFile={() => { closeSources(); setImportOpen(true); }} onClose={closeSources} />}
      {importOpen && (
        <ImportSheet
          existing={[...spendTxs, ...kakaoTxs]}
          helpers={tidyHelpers}
          onDone={async (count) => {
            setImportOpen(false);
            await tidyLocal({ getAll, put });
            window.dispatchEvent(new CustomEvent("budget-db-updated"));
            alert(`${count}건을 합쳤습니다.`);
          }}
          onClose={() => setImportOpen(false)}
        />
      )}
      {tidyOpen && (
        <TidySheet raws={unclassified} suggestions={suggestions} autoApplied={autoApplied} hasKey={hasKey} helpers={tidyHelpers} onPick={openUnclassified} onEdit={(t) => { setTidyOpen(false); openTx(t); }} onDismiss={dismissRaw} onChanged={reload} onClose={() => setTidyOpen(false)} />
      )}
      {editing && <SpendTxSheet tx={editing.tx} draft={editing.draft} raw={editing.raw} onSave={saveTx} onDelete={editing.tx || editing.draft ? deleteEditing : null} onClose={() => setEditing(null)} />}
    </S.Page>
  );
}
