import { useState } from "react";
import { useTheme } from "styled-components";
import { BudgetPlugin } from "../../plugins/BudgetPlugin";
import { CLAUDE_MODELS, formatTokens, formatUsd, getLimits, getModel, modelName, saveLimits, saveModel } from "../../utils/claudeClient";
import { won } from "../../pages/Kakao/KakaoCharts";
import { Sheet } from "../../pages/Kakao/KakaoSheets";
import * as S from "../../pages/Kakao/KakaoPage.styles";

// 키·모델·상한 설정 — 카카오뱅크 탭과 전체 소비 탭이 같은 값을 쓴다.
export function ClaudeSettingsSheet({ hasKey, onKeyChange, onClose }) {
  const [key, setKey] = useState("");
  const [model, setModel] = useState(getModel);
  const [limits, setLimits] = useState(getLimits);
  const [error, setError] = useState("");

  const saveKey = async () => {
    try {
      await BudgetPlugin.saveClaudeApiKey({ key });
      setKey("");
      setError("");
      onKeyChange(true);
    } catch (e) {
      setError(e?.message || "키를 저장하지 못했습니다.");
    }
  };
  const removeKey = async () => {
    if (!window.confirm("저장된 API 키를 삭제할까요?")) return;
    await BudgetPlugin.deleteClaudeApiKey();
    onKeyChange(false);
  };
  const setLimit = (field, value) => {
    const next = { ...limits, [field]: value };
    setLimits(next);
    saveLimits({ maxCalls: Number(next.maxCalls) || 0, maxUsd: Number(next.maxUsd) || 0 });
  };
  const pickModel = (id) => {
    setModel(id);
    saveModel(id);
  };

  return (
    <Sheet title="Claude 분석 설정" onClose={onClose}>
      <S.CardTitle>모델</S.CardTitle>
      <S.Segment style={{ marginBottom: 6 }}>
        {CLAUDE_MODELS.map((m) => (
          <S.SegmentBtn key={m.id} type="button" $active={model === m.id} onClick={() => pickModel(m.id)}>{m.name}</S.SegmentBtn>
        ))}
      </S.Segment>
      <S.Caption style={{ marginBottom: 4 }}>{CLAUDE_MODELS.find((m) => m.id === model)?.desc}</S.Caption>
      <S.Divider />
      <S.CardTitle>API 키</S.CardTitle>
      <S.Caption style={{ marginBottom: 10 }}>
        Android Keystore로 암호화해 이 기기에만 저장하고, 화면으로 다시 꺼내지 않습니다. 키는 Claude Console(platform.claude.com)에서 만들 수 있고, 요금은 그 계정으로 청구됩니다.
      </S.Caption>
      <S.Field>
        {hasKey ? "저장됨 — 새로 넣으면 교체" : "키 붙여넣기"}
        <input type="password" autoComplete="off" autoCapitalize="off" spellCheck={false} value={key} placeholder="sk-ant-..." onChange={(e) => setKey(e.target.value)} />
      </S.Field>
      {error && <S.Caption style={{ marginBottom: 8 }}>{error}</S.Caption>}
      <S.PrimaryBtn type="button" disabled={!key.trim()} onClick={saveKey}>키 저장</S.PrimaryBtn>
      {hasKey && <S.GhostBtn type="button" $danger onClick={removeKey}>저장된 키 삭제</S.GhostBtn>}
      <S.Divider />
      <S.CardTitle>월 상한</S.CardTitle>
      <S.Field>
        호출 횟수(회)
        <input inputMode="numeric" value={limits.maxCalls} onChange={(e) => setLimit("maxCalls", e.target.value.replace(/[^0-9]/g, ""))} />
      </S.Field>
      <S.Field>
        예상 비용(달러)
        <input inputMode="decimal" value={limits.maxUsd} onChange={(e) => setLimit("maxUsd", e.target.value.replace(/[^0-9.]/g, ""))} />
      </S.Field>
    </Sheet>
  );
}

export function UsageLine({ usage }) {
  const limits = getLimits();
  return (
    <S.Caption style={{ marginTop: 8 }}>
      이번 달 {usage.calls}/{limits.maxCalls}회 · 입력 {formatTokens(usage.input)} · 출력 {formatTokens(usage.output)} 토큰 · 약 {formatUsd(usage.usd)}/${limits.maxUsd}
    </S.Caption>
  );
}

// 분석 결과 표시. result = { analysis, at, model?, tokens?, usd? }
export function ClaudeResult({ result }) {
  const theme = useTheme();
  const { analysis } = result;
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ fontSize: 15, lineHeight: 1.6, fontWeight: 600 }}>{analysis.summary}</div>
      {analysis.warnings?.length > 0 && (
        <S.Detail style={{ background: theme.warningSoft }}>
          <strong style={{ fontSize: 13.5 }}>⚠️ 주의</strong>
          <S.Bullets style={{ marginTop: 6 }}>{analysis.warnings.map((t) => <li key={t}>{t}</li>)}</S.Bullets>
        </S.Detail>
      )}
      {analysis.patterns?.length > 0 && (
        <>
          <S.CardTitle style={{ marginTop: 14 }}>소비 패턴</S.CardTitle>
          <S.Bullets>{analysis.patterns.map((t) => <li key={t}>{t}</li>)}</S.Bullets>
        </>
      )}
      {analysis.savings?.length > 0 && (
        <>
          <S.CardTitle style={{ marginTop: 14 }}>절약 제안</S.CardTitle>
          {analysis.savings.map((s) => (
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
      <S.Caption style={{ marginTop: 10 }}>
        {new Date(result.at).toLocaleString("ko-KR")} 분석
        {result.model ? ` · ${modelName(result.model)}` : ""}
        {result.tokens ? ` · 입력 ${formatTokens(result.tokens.input)} · 출력 ${formatTokens(result.tokens.output)} 토큰 · 약 ${formatUsd(result.usd)}` : ""}
      </S.Caption>
      <S.Caption>AI 분석이라 틀릴 수 있습니다.</S.Caption>
    </div>
  );
}
