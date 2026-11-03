import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useTheme } from "styled-components";
import { BudgetPlugin } from "../../plugins/BudgetPlugin";
import { byCategory, byMerchant, shiftYm, toYm, txsOfMonth } from "../../utils/kakaoStats";
import { buildAnalysisPayload, loadResult, monthLabel, saveResult } from "../../utils/kakaoAnalysis";
import { getModel, getUsage, modelName, runAnalysis } from "../../utils/claudeClient";
import { ClaudeResult, ClaudeSettingsSheet, UsageLine } from "../../components/Claude/ClaudeParts";
import { categoryColor, won } from "./KakaoCharts";
import * as S from "./KakaoPage.styles";

export default function AnalysisTab({ txs, flow }) {
  const theme = useTheme();
  const currentYm = toYm(new Date());
  const isNative = Capacitor.isNativePlatform();
  const [ym, setYm] = useState(currentYm);
  const [hasKey, setHasKey] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(() => loadResult(currentYm));
  const [usage, setUsage] = useState(getUsage);

  useEffect(() => {
    if (!isNative) return;
    BudgetPlugin.hasClaudeApiKey().then((r) => setHasKey(!!r.exists)).catch(() => setHasKey(false));
  }, [isNative]);

  const list = useMemo(() => txsOfMonth(txs, ym), [txs, ym]);
  const categories = useMemo(() => byCategory(list), [list]);
  const merchants = useMemo(() => byMerchant(list).slice(0, 10), [list]);
  const payload = useMemo(() => buildAnalysisPayload(txs, flow, ym), [txs, flow, ym]);
  const total = categories.reduce((acc, r) => acc + r.amount, 0);
  const maxMerchant = merchants[0]?.amount || 1;

  const moveMonth = (delta) => {
    const next = shiftYm(ym, delta);
    setYm(next);
    setResult(loadResult(next));
    setError("");
  };

  const analyze = async () => {
    setError("");
    setRunning(true);
    const out = await runAnalysis(payload, { feature: "kakao_analysis" });
    if (out.analysis) {
      saveResult(ym, { analysis: out.analysis, model: out.model, tokens: out.tokens, usd: out.usd });
      setResult(loadResult(ym));
    } else {
      if (out.noKey) setHasKey(false);
      setError(out.error);
    }
    setRunning(false);
    setUsage(getUsage());
  };

  return (
    <>
      <S.Card>
        <S.MonthNav>
          <S.IconBtn type="button" aria-label="이전 달" onClick={() => moveMonth(-1)}>‹</S.IconBtn>
          <strong>{monthLabel(ym)}</strong>
          <S.IconBtn type="button" aria-label="다음 달" disabled={ym >= currentYm} onClick={() => moveMonth(1)}>›</S.IconBtn>
        </S.MonthNav>
        <S.CardTitle>어디에 얼마나 썼나</S.CardTitle>
        {categories.length === 0 && <S.Caption>이 달의 결제 내역이 없습니다.</S.Caption>}
        {categories.map((r) => (
          <S.RankRow key={r.name}>
            <div><span>{r.name} · {r.count}건</span><span>{won(r.amount)} ({Math.round((r.amount / total) * 100)}%)</span></div>
            <S.Bar $pct={(r.amount / total) * 100} $color={categoryColor(r.name, theme)} />
          </S.RankRow>
        ))}
      </S.Card>

      <S.Card>
        <S.CardTitle>가맹점 상위 10곳</S.CardTitle>
        {merchants.length === 0 && <S.Caption>이 달의 결제 내역이 없습니다.</S.Caption>}
        {merchants.map((r) => (
          <S.RankRow key={r.name}>
            <div><span>{r.name} · {r.count}건</span><span>{won(r.amount)}</span></div>
            <S.Bar $pct={(r.amount / maxMerchant) * 100} $color={theme.primary} />
          </S.RankRow>
        ))}
      </S.Card>

      <S.Card>
        <S.Row style={{ marginBottom: 8 }}>
          <S.CardTitle style={{ margin: 0 }}>Claude 소비 분석</S.CardTitle>
          {isNative && <S.AddBtn type="button" onClick={() => setSheetOpen(true)} style={{ minHeight: 36, background: theme.primarySoft, color: theme.primaryText }}>키·모델·상한</S.AddBtn>}
        </S.Row>
        {!isNative && <S.Caption>Claude 분석은 Android 앱에서만 동작합니다.</S.Caption>}
        {isNative && !hasKey && <S.Caption>키·모델·상한에서 Claude API 키를 넣으면 분석할 수 있습니다.</S.Caption>}
        {isNative && hasKey && (
          <>
            <S.PrimaryBtn type="button" disabled={running || total === 0} onClick={analyze}>
              {running ? "분석하는 중…" : result ? "다시 분석하기" : `${monthLabel(ym)} 분석하기`}
            </S.PrimaryBtn>
            <UsageLine usage={usage} />
            <S.Caption>모델: {modelName(getModel())}</S.Caption>
          </>
        )}
        <S.GhostBtn type="button" onClick={() => setPreviewOpen(!previewOpen)}>{previewOpen ? "보낼 내용 닫기" : "Claude로 보낼 내용 보기"}</S.GhostBtn>
        {previewOpen && (
          <>
            <S.Caption style={{ marginTop: 8 }}>합계와 순위 집계만 보냅니다. 개별 거래·시각·잔액·대출액·입금액·이체 상대는 보내지 않습니다.</S.Caption>
            <S.Pre>{JSON.stringify(payload, null, 2)}</S.Pre>
          </>
        )}
        {error && <S.Detail style={{ color: theme.errorText, fontSize: 13.5 }}>{error}</S.Detail>}
        {result && <ClaudeResult result={result} />}
      </S.Card>
      {sheetOpen && <ClaudeSettingsSheet hasKey={hasKey} onKeyChange={setHasKey} onClose={() => { setSheetOpen(false); setUsage(getUsage()); }} />}
    </>
  );
}
