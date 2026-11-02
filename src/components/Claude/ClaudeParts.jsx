import { useEffect, useState } from "react";
import { useTheme } from "styled-components";
import { BudgetPlugin } from "../../plugins/BudgetPlugin";
import { formatTokens, formatUsd, getLimits, getModel, loadModelState, modelDesc, modelName, refreshModels, saveLimits, saveModel } from "../../utils/claudeClient";
import { hasRawConsent, isTidyEnabled, setRawConsent, setTidyEnabled } from "../../utils/spendClassify";
import { won } from "../../pages/Kakao/KakaoCharts";
import { Sheet } from "../../pages/Kakao/KakaoSheets";
import * as S from "../../pages/Kakao/KakaoPage.styles";

// 키·모델·상한 설정 — 카카오뱅크 탭과 전체 소비 탭이 같은 값을 쓴다.
export function ClaudeSettingsSheet({ hasKey, onKeyChange, onClose }) {
  const [key, setKey] = useState("");
  const [model, setModel] = useState(getModel);
  const [limits, setLimits] = useState(getLimits);
  const [error, setError] = useState("");
  const [models, setModels] = useState(loadModelState);
  const [checking, setChecking] = useState(false);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [tidy, setTidy] = useState(isTidyEnabled);
  const [rawHelp, setRawHelp] = useState(hasRawConsent);

  const checkModels = async () => {
    setChecking(true);
    const state = await refreshModels();
    setModels(state);
    setModel(getModel());
    setChecking(false);
  };

  // 설정을 열 때마다 이 키로 쓸 수 있는 모델을 다시 확인한다.
  useEffect(() => {
    if (hasKey) checkModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasKey]);

  const toggleRawHelp = (on) => {
    if (on && !window.confirm("읽지 못한 알림의 문장을 Claude로 보내 읽기를 돕습니다. 잔액·긴 번호·가려진 이름은 지우고 보냅니다. 켤까요?")) return;
    setRawConsent(on);
    setRawHelp(on);
  };

  const saveKey = async () => {
    try {
      await BudgetPlugin.saveClaudeApiKey({ key });
      setKey("");
      setError("");
      onKeyChange(true);
      checkModels();
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
      {checking && <S.Caption style={{ marginBottom: 6 }}>이 키로 쓸 수 있는 모델을 확인하는 중…</S.Caption>}
      {models.note && <S.Caption style={{ marginBottom: 6 }}>{models.note}</S.Caption>}
      {!hasKey && <S.Caption style={{ marginBottom: 6 }}>키를 넣으면 실제로 쓸 수 있는 모델만 보여 드립니다.</S.Caption>}
      {models.available.map((m) => (
        <S.ModelRow key={m.id} type="button" $active={model === m.id} aria-pressed={model === m.id} onClick={() => pickModel(m.id)}>
          <span><strong>{modelName(m.id)}</strong><small>{modelDesc(m)}</small></span>
          <S.RadioDot $active={model === m.id} />
        </S.ModelRow>
      ))}
      {models.unavailable.length > 0 && (
        <>
          <S.FoldBtn type="button" aria-expanded={showUnavailable} onClick={() => setShowUnavailable(!showUnavailable)}>
            <span>사용 불가 모델 {models.unavailable.length}개</span>
            <span aria-hidden="true">{showUnavailable ? "접기" : "펼치기"}</span>
          </S.FoldBtn>
          {showUnavailable && models.unavailable.map((m) => (
            <S.ModelRow key={m.id} as="div" $disabled>
              <span><strong>{modelName(m.id)}</strong><small>{m.reason}</small></span>
            </S.ModelRow>
          ))}
        </>
      )}
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
      <S.Divider />
      <S.CardTitle>미분류 자동 정리</S.CardTitle>
      <S.CheckRow>
        <input type="checkbox" checked={tidy} onChange={(e) => { setTidy(e.target.checked); setTidyEnabled(e.target.checked); }} />
        하루 한 번 Claude로 카테고리 정리
      </S.CheckRow>
      <S.Caption style={{ marginBottom: 8 }}>앱을 켰을 때 실행합니다. 가맹점 이름·금액대·시간대만 보내며, 토큰과 비용은 위 상한에 포함됩니다. 이전 분류와 같은 가맹점은 Claude 없이 앱이 맞춥니다.</S.Caption>
      <S.CheckRow>
        <input type="checkbox" checked={rawHelp} onChange={(e) => toggleRawHelp(e.target.checked)} />
        읽지 못한 알림도 Claude로 읽기
      </S.CheckRow>
      <S.Caption>잔액·긴 번호·가려진 이름을 지운 문장을 보냅니다. 켠 뒤 미분류 화면에서 직접 실행합니다.</S.Caption>
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
      {analysis.sourceComments?.length > 0 && (
        <>
          <S.CardTitle style={{ marginTop: 14 }}>금융사별 코멘트</S.CardTitle>
          {analysis.sourceComments.map((c) => (
            <S.Detail key={c.source} style={{ marginTop: 8 }}>
              <strong style={{ fontSize: 14 }}>{c.source}</strong>
              <S.Caption style={{ marginTop: 4 }}>{c.comment}</S.Caption>
            </S.Detail>
          ))}
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
