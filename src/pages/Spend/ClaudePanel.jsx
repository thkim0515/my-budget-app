import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useTheme } from "styled-components";
import { BudgetPlugin } from "../../plugins/BudgetPlugin";
import { getModel, getUsage, modelName, runAnalysis } from "../../utils/claudeClient";
import { buildSpendPayload, loadSpendResults, saveSpendResult } from "../../utils/spendStats";
import { ClaudeResult, ClaudeSettingsSheet, UsageLine } from "../../components/Claude/ClaudeParts";
import * as S from "../Kakao/KakaoPage.styles";

// 위에서 고른 기간을 그대로 분석한다. 결과는 기간별로 저장해 다시 볼 수 있다.
export default function ClaudePanel({ txs, period }) {
  const theme = useTheme();
  const isNative = Capacitor.isNativePlatform();
  const [hasKey, setHasKey] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState(loadSpendResults);
  const [openKey, setOpenKey] = useState(null);
  const [usage, setUsage] = useState(getUsage);

  useEffect(() => {
    if (!isNative) return;
    BudgetPlugin.hasClaudeApiKey().then((r) => setHasKey(!!r.exists)).catch(() => setHasKey(false));
  }, [isNative]);

  const payload = useMemo(() => buildSpendPayload(txs, period), [txs, period]);
  const current = results.find((r) => r.key === period.key);
  const others = results.filter((r) => r.key !== period.key);
  const opened = others.find((r) => r.key === openKey);

  const analyze = async () => {
    setError("");
    setRunning(true);
    const out = await runAnalysis(payload);
    if (out.analysis) {
      setResults(saveSpendResult({ key: period.key, label: period.label, analysis: out.analysis, model: out.model, tokens: out.tokens, usd: out.usd }));
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
        <S.Row style={{ marginBottom: 8 }}>
          <S.CardTitle style={{ margin: 0 }}>Claude 정밀 분석</S.CardTitle>
          {isNative && <S.AddBtn type="button" onClick={() => setSheetOpen(true)} style={{ minHeight: 36, background: theme.primarySoft, color: theme.primaryText }}>키·모델·상한</S.AddBtn>}
        </S.Row>
        {!isNative && <S.Caption>Claude 분석은 Android 앱에서만 동작합니다.</S.Caption>}
        {isNative && !hasKey && <S.Caption>키·모델·상한에서 Claude API 키를 넣으면 분석할 수 있습니다.</S.Caption>}
        {isNative && hasKey && (
          <>
            <S.PrimaryBtn type="button" disabled={running || payload.결제건수 === 0} onClick={analyze}>
              {running ? "분석하는 중…" : `${period.label} ${current ? "다시 " : ""}분석하기`}
            </S.PrimaryBtn>
            <S.Caption style={{ marginTop: 8 }}>모델: {modelName(getModel())}</S.Caption>
            <UsageLine usage={usage} />
          </>
        )}
        <S.GhostBtn type="button" onClick={() => setPreviewOpen(!previewOpen)}>{previewOpen ? "보낼 내용 닫기" : "Claude로 보낼 내용 보기"}</S.GhostBtn>
        {previewOpen && (
          <>
            <S.Caption style={{ marginTop: 8 }}>합계와 순위 집계만 보냅니다. 개별 거래·알림 원문·잔액·계좌·이체 상대는 보내지 않습니다.</S.Caption>
            <S.Pre>{JSON.stringify(payload, null, 2)}</S.Pre>
          </>
        )}
        {error && <S.Detail style={{ color: theme.errorText, fontSize: 13.5 }}>{error}</S.Detail>}
        {current && <ClaudeResult result={current} />}
      </S.Card>
      {others.length > 0 && (
        <S.Card>
          <S.CardTitle>저장된 분석</S.CardTitle>
          {others.map((r) => (
            <S.TxBtn key={r.key} type="button" onClick={() => setOpenKey(openKey === r.key ? null : r.key)}>
              <span>
                <strong>{r.label}</strong>
                <small>{modelName(r.model)} · {new Date(r.at).toLocaleDateString("ko-KR")}</small>
              </span>
              <span>{openKey === r.key ? "닫기" : "보기"}</span>
            </S.TxBtn>
          ))}
          {opened && <ClaudeResult result={opened} />}
        </S.Card>
      )}
      {sheetOpen && <ClaudeSettingsSheet hasKey={hasKey} onKeyChange={setHasKey} onClose={() => { setSheetOpen(false); setUsage(getUsage()); }} />}
    </>
  );
}
