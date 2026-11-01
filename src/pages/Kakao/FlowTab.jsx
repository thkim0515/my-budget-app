import { useMemo, useState } from "react";
import { useTheme } from "styled-components";
import { budgetSummary, flowOf, flowSeries, netAt, splitNet, toDateKey, toYm, txsOfMonth } from "../../utils/kakaoStats";
import { NetLine, won } from "./KakaoCharts";
import { TxList } from "./PaymentsTab";
import * as S from "./KakaoPage.styles";

export default function FlowTab({ txs, flow, onChangeFlow, onOpenSettings, onEdit }) {
  const theme = useTheme();
  const now = new Date();
  const [days, setDays] = useState(30);
  const [selected, setSelected] = useState(null);

  const summary = budgetSummary(txs, flow, now);
  const net = netAt(txs, flow, now.getTime());
  const split = net == null ? null : splitNet(net, flow);
  const rows = useMemo(() => flowSeries(txs, flow, days), [txs, flow, days]);
  const row = selected != null ? rows[selected] : null;
  const dayList = useMemo(() => (row ? txs.filter((t) => toDateKey(new Date(t.ts)) === row.key && !t.excludeFromFlow) : []), [txs, row]);

  const monthList = txsOfMonth(txs, toYm(now)).filter((t) => !t.excludeFromFlow);
  const inflow = monthList.reduce((acc, t) => acc + Math.max(flowOf(t), 0), 0);
  const outflow = monthList.reduce((acc, t) => acc + Math.max(-flowOf(t), 0), 0);

  // 알림에 잔액이 찍혀 있으면 계산값과 비교해 한 번에 맞출 수 있게 한다.
  const reported = txs.find((t) => t.balanceAfter != null);
  const reportedIsNew = reported && (flow.anchorAt == null || reported.ts > flow.anchorAt);
  const computedBalance = split ? net + (flow.anchorLoan || 0) : null;
  const mismatch = reportedIsNew && split && reported.balanceAfter !== computedBalance;

  const alignToReported = () => {
    onChangeFlow({ ...flow, anchorNet: reported.balanceAfter - (flow.anchorLoan || 0), anchorAt: reported.ts });
  };

  const budgetPct = summary.budget > 0 ? (summary.spent / summary.budget) * 100 : 0;
  const limitPct = flow.limit > 0 && split ? (split.used / flow.limit) * 100 : 0;

  return (
    <>
      <S.Card>
        <S.Row>
          <S.HeroLabel>이번 달 남은 예산</S.HeroLabel>
          <S.AddBtn type="button" onClick={onOpenSettings} style={{ minHeight: 36, background: theme.primarySoft, color: theme.primaryText }}>자금 설정</S.AddBtn>
        </S.Row>
        {summary.hasBudget ? (
          <>
            <S.HeroValue $negative={summary.remaining < 0}>{won(summary.remaining)}</S.HeroValue>
            <S.Meter $pct={budgetPct} $danger={summary.remaining < 0}><div /></S.Meter>
            <S.Stats $cols={3}>
              <S.Stat><div>예산</div><div>{won(summary.budget)}</div></S.Stat>
              <S.Stat><div>이번 달 결제</div><div>{won(summary.spent)}</div></S.Stat>
              <S.Stat><div>하루 권장({summary.daysLeft}일 남음)</div><div>{won(summary.perDay)}</div></S.Stat>
            </S.Stats>
          </>
        ) : (
          <S.Caption style={{ marginTop: 8 }}>자금 설정에서 매달 예산이나 지금 남은 예산을 넣으면 하루 권장 사용액을 계산합니다.</S.Caption>
        )}
      </S.Card>

      <S.Card>
        <S.CardTitle>현재 카카오뱅크 자금</S.CardTitle>
        {split ? (
          <>
            <S.HeroLabel>쓸 수 있는 돈(잔액 + 남은 마이너스 한도)</S.HeroLabel>
            <S.HeroValue>{won(split.available)}</S.HeroValue>
            <S.Stats>
              <S.Stat><div>통장 잔액</div><div>{won(split.balance)}</div></S.Stat>
              <S.Stat $color={split.used > 0 ? "expenseColor" : undefined}><div>마이너스 사용액</div><div>{won(split.used)}</div></S.Stat>
            </S.Stats>
            {flow.limit > 0 && (
              <>
                <S.Meter $pct={limitPct} $danger={limitPct >= 80}><div /></S.Meter>
                <S.Caption style={{ marginTop: 6 }}>한도 {won(flow.limit)} 중 {Math.round(limitPct)}% 사용</S.Caption>
              </>
            )}
            {mismatch && (
              <S.Detail>
                <S.Caption>최근 알림의 잔액은 {won(reported.balanceAfter)}인데 앱 계산은 {won(computedBalance)}입니다.</S.Caption>
                <S.GhostBtn type="button" onClick={alignToReported}>알림 잔액으로 맞추기</S.GhostBtn>
              </S.Detail>
            )}
          </>
        ) : (
          <>
            <S.Caption>통장 잔액과 마이너스 사용액을 한 번 넣어 두면, 이후 결제·입금을 반영해 자금 흐름을 따라갑니다.</S.Caption>
            <S.GhostBtn type="button" onClick={onOpenSettings}>현재 자금 입력하기</S.GhostBtn>
          </>
        )}
      </S.Card>

      {split && (
        <S.Card>
          <S.Row style={{ marginBottom: 10 }}>
            <S.CardTitle style={{ margin: 0 }}>순자금 추이</S.CardTitle>
            <S.Segment style={{ flexShrink: 0 }}>
              {[30, 90].map((d) => (
                <S.SegmentBtn key={d} type="button" style={{ padding: "0 12px" }} $active={days === d} onClick={() => { setDays(d); setSelected(null); }}>{d}일</S.SegmentBtn>
              ))}
            </S.Segment>
          </S.Row>
          <S.Legend>
            <span><S.LegendKey $color={theme.primary} />순자금(잔액 − 마이너스)</span>
            {flow.limit > 0 && <span><S.LegendKey $color={theme.expenseColor} $dashed />마이너스 한도</span>}
          </S.Legend>
          <NetLine rows={rows} limit={flow.limit} selected={selected} onSelect={setSelected} />
          {row ? (
            <S.Detail>
              <S.Row>
                <strong style={{ fontSize: 14 }}>{row.label} 마감</strong>
                <strong style={{ fontSize: 15, color: row.net < 0 ? theme.expenseColor : theme.text }}>{won(row.net)}</strong>
              </S.Row>
              <S.Caption style={{ marginTop: 4 }}>입금 {won(row.inflow)} · 출금 {won(row.outflow)}</S.Caption>
              {dayList.length > 0 && <div style={{ marginTop: 8 }}><TxList list={dayList} onEdit={onEdit} /></div>}
            </S.Detail>
          ) : (
            <S.Caption style={{ marginTop: 10 }}>선을 누르면 그날의 입출금을 볼 수 있습니다.</S.Caption>
          )}
        </S.Card>
      )}

      <S.Card>
        <S.CardTitle>이번 달 입출금</S.CardTitle>
        <S.Stats $cols={3} style={{ marginTop: 0 }}>
          <S.Stat $color="incomeColor"><div>입금</div><div>{won(inflow)}</div></S.Stat>
          <S.Stat><div>출금</div><div>{won(outflow)}</div></S.Stat>
          <S.Stat $color={inflow - outflow < 0 ? "expenseColor" : undefined}><div>증감</div><div>{won(inflow - outflow)}</div></S.Stat>
        </S.Stats>
        {monthList.length === 0 && <S.Caption style={{ marginTop: 8 }}>이번 달 내역이 아직 없습니다.</S.Caption>}
      </S.Card>
    </>
  );
}
