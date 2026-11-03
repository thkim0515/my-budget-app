import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useTheme } from "styled-components";
import { BudgetPlugin } from "../../plugins/BudgetPlugin";
import { estimateCall, formatTokens, formatUsd, getModel, getUsage, modelName, runAnalysis, SPEND_ANALYSIS_OPTS } from "../../utils/claudeClient";
import { buildSpendPayload, compareCategories, inPeriod, loadSpendResults, previousPeriod, saveSpendResult, totalSpend } from "../../utils/spendStats";
import { tidyLocal, tidyWithClaude } from "../../utils/spendClassify";
import { ClaudeResult, ClaudeSettingsSheet, UsageLine } from "../../components/Claude/ClaudeParts";
import { won } from "../Kakao/KakaoCharts";
import * as S from "../Kakao/KakaoPage.styles";

const LEVEL_KEY = "spendClaudeLevel";
const LEVELS = [["detail", "상세 분석"], ["summary", "요약 분석"]];
const LEVEL_TEXT = {
  detail: "거래내역서를 주는 것처럼 지출 한 건씩의 일시·가맹점·금액·카테고리·출처를 보냅니다. 계좌번호·카드번호·잔액·입금·이체는 보내지 않습니다.",
  summary: "금융사·카테고리·가맹점·시간대별 합계만 보냅니다. 한 건씩의 내역은 보내지 않습니다.",
};
const loadLevel = () => {
  try {
    return localStorage.getItem(LEVEL_KEY) === "summary" ? "summary" : "detail";
  } catch {
    return "detail";
  }
};

// 위에서 고른 기간을 그대로 분석한다. 결과는 기간별로 저장해 다시 볼 수 있다.
export default function ClaudePanel({ txs, period, helpers, onChanged }) {
  const theme = useTheme();
  const isNative = Capacitor.isNativePlatform();
  const [hasKey, setHasKey] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [results, setResults] = useState(loadSpendResults);
  const [openKey, setOpenKey] = useState(null);
  const [usage, setUsage] = useState(getUsage);
  const [level, setLevel] = useState(loadLevel);
  const [modelTick, setModelTick] = useState(0);

  useEffect(() => {
    if (!isNative) return;
    BudgetPlugin.hasClaudeApiKey().then((r) => setHasKey(!!r.exists)).catch(() => setHasKey(false));
  }, [isNative]);

  const pickLevel = (next) => {
    setLevel(next);
    try {
      localStorage.setItem(LEVEL_KEY, next);
    } catch {
      /* 다음에는 기본값 */
    }
  };

  const payload = useMemo(() => buildSpendPayload(txs, period, level), [txs, period, level]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const estimate = useMemo(() => estimateCall(payload, SPEND_ANALYSIS_OPTS), [payload, usage, modelTick]);
  const list = useMemo(() => inPeriod(txs, period), [txs, period]);
  const prev = previousPeriod(period);
  const prevList = useMemo(() => inPeriod(txs, prev), [txs, prev]);
  const compare = useMemo(() => compareCategories(list, prevList).slice(0, 6), [list, prevList]);
  const diff = totalSpend(list) - totalSpend(prevList);
  const current = results.find((r) => r.key === period.key);
  const prevSaved = results.find((r) => r.key === prev.key);
  const others = results.filter((r) => r.key !== period.key);
  const opened = others.find((r) => r.key === openKey);
  const count = payload.결제건수;

  const analyze = async () => {
    setError("");
    setNote("");
    setRunning(true);
    // 분석 전에 미분류부터 정리한다(앱 비교 → 남은 것만 Claude). 정리가 막혀도 분석은 계속한다.
    let tidyNote = "";
    if (helpers) {
      await tidyLocal(helpers);
      const tidy = await tidyWithClaude(helpers);
      if (!tidy.skipped && !tidy.error) tidyNote = `미분류 정리: 자동 적용 ${tidy.applied}건 · 추천 ${tidy.suggested}건 (입력 ${formatTokens(tidy.tokens?.input)} · 출력 ${formatTokens(tidy.tokens?.output)} 토큰 · 약 ${formatUsd(tidy.usd)})`;
      onChanged?.();
    }
    const out = await runAnalysis(payload, { ...SPEND_ANALYSIS_OPTS, feature: "spend_analysis" });
    if (out.analysis) {
      setResults(saveSpendResult({ key: period.key, label: period.label, level, count, total: payload.결제합계, analysis: out.analysis, model: out.model, tokens: out.tokens, usd: out.usd }));
    } else {
      if (out.noKey) setHasKey(false);
      setError(out.error);
    }
    setNote(tidyNote);
    setRunning(false);
    setUsage(getUsage());
  };

  return (
    <>
      <S.Card>
        <S.Row style={{ marginBottom: 12 }}>
          <S.CardTitle style={{ margin: 0 }}>Claude 정밀 분석</S.CardTitle>
          {isNative && <S.AddBtn type="button" onClick={() => setSheetOpen(true)} style={{ minHeight: 36, background: theme.primarySoft, color: theme.primaryText }}>키·모델·상한</S.AddBtn>}
        </S.Row>
        <S.Segment style={{ marginBottom: 8 }}>
          {LEVELS.map(([key, label]) => <S.SegmentBtn key={key} type="button" $active={level === key} onClick={() => pickLevel(key)}>{label}</S.SegmentBtn>)}
        </S.Segment>
        <S.Caption>{LEVEL_TEXT[level]}</S.Caption>
        <S.Detail>
          <strong style={{ fontSize: 14 }}>{period.label}</strong>
          <S.Caption style={{ marginTop: 2 }}>지출 {count}건 · 입력 약 {formatTokens(estimate.inputTokens)} 토큰 · 예상 {formatUsd(estimate.usd)} (최대 {formatUsd(estimate.worst)})</S.Caption>
        </S.Detail>
        <div style={{ marginTop: 12 }}>
          {!isNative && <S.Caption>Claude 분석은 Android 앱에서만 동작합니다.</S.Caption>}
          {isNative && !hasKey && <S.Caption>키·모델·상한에서 Claude API 키를 넣으면 분석할 수 있습니다.</S.Caption>}
          {isNative && hasKey && (
            <>
              <S.PrimaryBtn type="button" disabled={running || count === 0} onClick={analyze}>
                {running ? "분석하는 중…" : `${current ? "다시 " : ""}분석하기`}
              </S.PrimaryBtn>
              {estimate.blocked && <S.Caption style={{ marginTop: 8, color: theme.errorText }}>{estimate.blocked}</S.Caption>}
              <S.Caption style={{ marginTop: 8 }}>모델: {modelName(getModel())}</S.Caption>
              <UsageLine usage={usage} />
            </>
          )}
        </div>
        <S.GhostBtn type="button" onClick={() => setPreviewOpen(!previewOpen)}>{previewOpen ? "보낼 내용 닫기" : "Claude로 보낼 내용 보기"}</S.GhostBtn>
        {previewOpen && <S.Pre>{JSON.stringify(payload, null, 2)}</S.Pre>}
        {note && <S.Caption style={{ marginTop: 8 }}>{note}</S.Caption>}
        {error && <S.Detail style={{ color: theme.errorText, fontSize: 13.5 }}>{error}</S.Detail>}
        {current && (current.total !== payload.결제합계 || current.count !== count) && (
          <S.Caption style={{ marginTop: 8 }}>분석한 뒤 내역이나 금융사 선택이 바뀌었습니다. 다시 분석하면 반영됩니다.</S.Caption>
        )}
        {current && <ClaudeResult result={current} />}
      </S.Card>

      <S.Card>
        <S.CardTitle>직전 기간과 비교</S.CardTitle>
        <S.Caption style={{ marginBottom: 8 }}>{prev.label} 대비</S.Caption>
        <S.Row style={{ marginBottom: 6 }}>
          <span style={{ fontSize: 14 }}>결제 합계</span>
          {totalSpend(prevList) > 0 ? <S.Delta $up={diff > 0}>{diff > 0 ? "+" : "-"}{won(Math.abs(diff))}</S.Delta> : <S.Caption>직전 내역 없음</S.Caption>}
        </S.Row>
        {compare.map((r) => (
          <S.RankRow key={r.name}>
            <div>
              <span>{r.name}</span>
              <span>{won(r.prev)} → {won(r.amount)}</span>
            </div>
          </S.RankRow>
        ))}
        {prevSaved && (
          <S.GhostBtn type="button" onClick={() => setOpenKey(openKey === prev.key ? null : prev.key)}>{openKey === prev.key ? "직전 분석 닫기" : "직전 기간 Claude 분석 보기"}</S.GhostBtn>
        )}
      </S.Card>

      {others.length > 0 && (
        <S.Card>
          <S.CardTitle>저장된 분석</S.CardTitle>
          {others.map((r) => (
            <S.TxBtn key={r.key} type="button" onClick={() => setOpenKey(openKey === r.key ? null : r.key)}>
              <span>
                <strong>{r.label}</strong>
                <small>{modelName(r.model)} · {r.level === "summary" ? "요약" : "상세"} · {new Date(r.at).toLocaleDateString("ko-KR")}</small>
              </span>
              <span>{openKey === r.key ? "닫기" : "보기"}</span>
            </S.TxBtn>
          ))}
          {opened && <ClaudeResult result={opened} />}
        </S.Card>
      )}
      {sheetOpen && <ClaudeSettingsSheet hasKey={hasKey} onKeyChange={setHasKey} onClose={() => { setSheetOpen(false); setUsage(getUsage()); setModelTick((n) => n + 1); }} />}
    </>
  );
}
