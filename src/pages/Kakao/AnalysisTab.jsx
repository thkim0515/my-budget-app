import { useEffect, useMemo, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { useTheme } from "styled-components";
import { BudgetPlugin } from "../../plugins/BudgetPlugin";
import { byCategory, byMerchant, shiftYm, toYm, txsOfMonth } from "../../utils/kakaoStats";
import {
  blockReason, buildAnalysisPayload, buildRequestBody, getLimits, getUsage, loadResult, monthLabel,
  parseResponse, reserveCall, saveLimits, saveResult, settleCall,
} from "../../utils/kakaoAnalysis";
import { categoryColor, won } from "./KakaoCharts";
import { Sheet } from "./KakaoSheets";
import * as S from "./KakaoPage.styles";

function KeySheet({ hasKey, onSaved, onClose }) {
  const [key, setKey] = useState("");
  const [limits, setLimits] = useState(getLimits);
  const [error, setError] = useState("");

  const saveKey = async () => {
    try {
      await BudgetPlugin.saveClaudeApiKey({ key });
      setKey("");
      setError("");
      onSaved(true);
    } catch (e) {
      setError(e?.message || "키를 저장하지 못했습니다.");
    }
  };
  const removeKey = async () => {
    if (!window.confirm("저장된 API 키를 삭제할까요?")) return;
    await BudgetPlugin.deleteClaudeApiKey();
    onSaved(false);
  };
  const setLimit = (field, value) => {
    const next = { ...limits, [field]: Math.max(Number(value) || 0, 0) };
    setLimits(next);
    saveLimits(next);
  };

  return (
    <Sheet title="Claude 분석 설정" onClose={onClose}>
      <S.Caption style={{ marginBottom: 10 }}>
        API 키는 Android Keystore로 암호화해 이 기기에만 저장하고, 화면으로 다시 꺼내지 않습니다. 키는 Claude Console(platform.claude.com)에서 만들 수 있고, 사용 요금은 그 계정으로 청구됩니다.
      </S.Caption>
      <S.Field>
        API 키 {hasKey ? "(저장됨 — 새로 넣으면 교체)" : ""}
        <input type="password" autoComplete="off" autoCapitalize="off" spellCheck={false} value={key} placeholder="sk-ant-..." onChange={(e) => setKey(e.target.value)} />
      </S.Field>
      {error && <S.Caption style={{ marginBottom: 8, color: "inherit" }}>{error}</S.Caption>}
      <S.PrimaryBtn type="button" disabled={!key.trim()} onClick={saveKey}>키 저장</S.PrimaryBtn>
      {hasKey && <S.GhostBtn type="button" $danger onClick={removeKey}>저장된 키 삭제</S.GhostBtn>}
      <S.Divider />
      <S.Field>
        월 호출 상한(회)
        <input inputMode="numeric" value={limits.maxCalls} onChange={(e) => setLimit("maxCalls", e.target.value.replace(/[^0-9]/g, ""))} />
      </S.Field>
      <S.Field>
        월 비용 상한(달러)
        <input inputMode="decimal" value={limits.maxUsd} onChange={(e) => setLimit("maxUsd", e.target.value.replace(/[^0-9.]/g, ""))} />
      </S.Field>
    </Sheet>
  );
}

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
    const blocked = blockReason();
    if (blocked) {
      setError(blocked);
      return;
    }
    setRunning(true);
    reserveCall();
    try {
      const res = await BudgetPlugin.claudeMessages({ body: buildRequestBody(payload) });
      const parsed = parseResponse(res.status, res.body);
      settleCall(parsed.usd);
      if (parsed.analysis) {
        saveResult(ym, parsed.analysis);
        setResult(loadResult(ym));
      } else {
        setError(parsed.error);
      }
    } catch (e) {
      // 네트워크 오류는 청구 여부를 알 수 없어 잡아 둔 비용을 그대로 둔다. 키가 없으면 청구되지 않았다.
      if (e?.message === "NO_KEY") {
        settleCall(0);
        setHasKey(false);
        setError("저장된 API 키를 읽을 수 없습니다. 키를 다시 넣어 주세요.");
      } else {
        setError("네트워크 오류로 분석하지 못했습니다.");
      }
    } finally {
      setRunning(false);
      setUsage(getUsage());
    }
  };

  const limits = getLimits();

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
          {isNative && <S.AddBtn type="button" onClick={() => setSheetOpen(true)} style={{ minHeight: 36, background: theme.primarySoft, color: theme.primaryText }}>키·상한 설정</S.AddBtn>}
        </S.Row>
        {!isNative && <S.Caption>Claude 분석은 Android 앱에서만 동작합니다.</S.Caption>}
        {isNative && !hasKey && <S.Caption>키·상한 설정에서 Claude API 키를 넣으면 분석할 수 있습니다.</S.Caption>}
        {isNative && hasKey && (
          <>
            <S.PrimaryBtn type="button" disabled={running || total === 0} onClick={analyze}>
              {running ? "분석하는 중…" : result ? "다시 분석하기" : `${monthLabel(ym)} 분석하기`}
            </S.PrimaryBtn>
            <S.Caption style={{ marginTop: 8 }}>
              이번 달 {usage.calls}/{limits.maxCalls}회 · 약 ${usage.usd.toFixed(2)}/${limits.maxUsd} 사용
            </S.Caption>
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
        {result && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 15, lineHeight: 1.6, fontWeight: 600 }}>{result.analysis.summary}</div>
            {result.analysis.warnings?.length > 0 && (
              <S.Detail style={{ background: theme.warningSoft }}>
                <strong style={{ fontSize: 13.5 }}>⚠️ 주의</strong>
                <S.Bullets style={{ marginTop: 6 }}>{result.analysis.warnings.map((t) => <li key={t}>{t}</li>)}</S.Bullets>
              </S.Detail>
            )}
            {result.analysis.patterns?.length > 0 && (
              <>
                <S.CardTitle style={{ marginTop: 14 }}>소비 패턴</S.CardTitle>
                <S.Bullets>{result.analysis.patterns.map((t) => <li key={t}>{t}</li>)}</S.Bullets>
              </>
            )}
            {result.analysis.savings?.length > 0 && (
              <>
                <S.CardTitle style={{ marginTop: 14 }}>절약 제안</S.CardTitle>
                {result.analysis.savings.map((s) => (
                  <S.Detail key={s.title} style={{ marginTop: 8 }}>
                    <S.Row>
                      <strong style={{ fontSize: 14 }}>{s.title}</strong>
                      {s.monthlySaving > 0 && <S.Delta style={{ flexShrink: 0 }}>월 약 {won(s.monthlySaving)}</S.Delta>}
                    </S.Row>
                    <S.Caption style={{ marginTop: 4 }}>{s.detail}</S.Caption>
                  </S.Detail>
                ))}
              </>
            )}
            <S.Caption style={{ marginTop: 10 }}>{new Date(result.at).toLocaleString("ko-KR")} 분석 결과 · AI 분석이라 틀릴 수 있습니다.</S.Caption>
          </div>
        )}
      </S.Card>
      {sheetOpen && <KeySheet hasKey={hasKey} onSaved={(v) => { setHasKey(v); setSheetOpen(false); }} onClose={() => setSheetOpen(false)} />}
    </>
  );
}
