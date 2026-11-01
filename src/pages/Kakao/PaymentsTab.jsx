import { useMemo, useState } from "react";
import { useTheme } from "styled-components";
import { byCategory, dailySeries, KIND_LABEL, monthlySeries, monthSpend, parseYm, shiftYm, spendOf, toDateKey, toYm, txsOfMonth, weeklySeries } from "../../utils/kakaoStats";
import { CategoryDoughnut, categoryColor, CumulativeLines, SpendBars, won } from "./KakaoCharts";
import * as S from "./KakaoPage.styles";

const formatWhen = (ts) => new Date(ts).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function TxList({ list, onEdit }) {
  const theme = useTheme();
  return list.map((tx) => {
    const positive = tx.kind === "income" || tx.kind === "refund";
    return (
      <S.TxBtn key={tx.id} type="button" onClick={() => onEdit(tx)}>
        <span>
          <strong>{tx.merchant}</strong>
          <small>{formatWhen(tx.ts)} · {tx.kind === "payment" ? tx.category : KIND_LABEL[tx.kind]}{tx.inputMode === "manual" ? " · 직접 입력" : ""}</small>
        </span>
        <span style={{ color: positive ? theme.incomeColor : theme.text }}>{positive ? "+" : "-"}{won(tx.amount)}</span>
      </S.TxBtn>
    );
  });
}

function DeltaText({ current, previous, label }) {
  if (!previous) return <S.Caption>{label} 내역 없음</S.Caption>;
  const diff = current - previous;
  if (diff === 0) return <S.Caption>{label}과 같음</S.Caption>;
  return <S.Delta $up={diff > 0}>{label}보다 {won(Math.abs(diff))} {diff > 0 ? "더 씀" : "덜 씀"} ({Math.round((Math.abs(diff) / previous) * 100)}%)</S.Delta>;
}

const DeltaPlain = ({ current, previous, label }) => {
  if (!previous) return `${label} 내역 없음`;
  const diff = current - previous;
  if (diff === 0) return `${label}과 같음`;
  return `${label}보다 ${won(Math.abs(diff))} ${diff > 0 ? "더 씀" : "덜 씀"}`;
};

export default function PaymentsTab({ txs, onEdit }) {
  const theme = useTheme();
  const now = new Date();
  const currentYm = toYm(now);
  const [period, setPeriod] = useState("day");
  const [ym, setYm] = useState(currentYm);
  const [selected, setSelected] = useState(null);

  const switchPeriod = (next) => { setPeriod(next); setSelected(null); };
  const moveMonth = (delta) => { setYm(shiftYm(ym, delta)); setSelected(null); };

  const daily = useMemo(() => dailySeries(txs, ym), [txs, ym]);
  const weekly = useMemo(() => weeklySeries(txs), [txs]);
  const monthly = useMemo(() => monthlySeries(txs), [txs]);
  const rows = period === "day" ? daily : period === "week" ? weekly : monthly;

  const monthTotal = monthSpend(txs, ym);
  const prevYm = shiftYm(ym, -1);
  const monthList = useMemo(() => txsOfMonth(txs, ym), [txs, ym]);
  const categories = useMemo(() => byCategory(monthList), [monthList]);
  const categoryTotal = categories.reduce((acc, r) => acc + r.amount, 0);
  const label = `${parseYm(ym).getFullYear()}년 ${parseYm(ym).getMonth() + 1}월`;

  // 전월 대비는 "오늘까지"끼리 비교해야 공정하다(이번 달이면 전월 같은 날까지의 누적과 비교).
  const lastCumRow = [...daily].reverse().find((r) => r.cum != null);
  const prevComparable = ym === currentYm ? daily[now.getDate() - 1]?.prevCum ?? monthSpend(txs, prevYm) : monthSpend(txs, prevYm);

  const selectedRow = selected != null ? rows[selected] : null;
  const previousRow = selected > 0 ? rows[selected - 1] : null;
  const detailList = useMemo(() => {
    if (!selectedRow) return [];
    const match = period === "day"
      ? (t) => toDateKey(new Date(t.ts)) === selectedRow.key
      : (t) => t.ts >= selectedRow.from && t.ts < selectedRow.to;
    return txs.filter((t) => match(t) && spendOf(t) !== 0);
  }, [txs, selectedRow, period]);

  const recent = monthList.slice(0, 30);

  return (
    <>
      <S.Card>
        <S.MonthNav>
          <S.IconBtn type="button" aria-label="이전 달" onClick={() => moveMonth(-1)}>‹</S.IconBtn>
          <strong>{label}</strong>
          <S.IconBtn type="button" aria-label="다음 달" disabled={ym >= currentYm} onClick={() => moveMonth(1)}>›</S.IconBtn>
        </S.MonthNav>
      </S.Card>
      <S.Hero>
        <S.HeroLabel $onHero>{parseYm(ym).getMonth() + 1}월 결제 누적</S.HeroLabel>
        <S.HeroValue $onHero>{won(monthTotal)}</S.HeroValue>
        <S.HeroNote><DeltaPlain current={lastCumRow?.cum ?? monthTotal} previous={prevComparable} label={ym === currentYm ? "전월 같은 날까지" : "전월"} /></S.HeroNote>
      </S.Hero>

      <S.Card>
        <S.Segment style={{ marginBottom: 12 }}>
          {[["day", "일별"], ["week", "주별"], ["month", "월별"]].map(([key, text]) => (
            <S.SegmentBtn key={key} type="button" $active={period === key} onClick={() => switchPeriod(key)}>{text}</S.SegmentBtn>
          ))}
        </S.Segment>
        <S.CardTitle>{period === "day" ? `${parseYm(ym).getMonth() + 1}월 일별 결제` : period === "week" ? "최근 10주 결제" : "최근 12개월 결제"}</S.CardTitle>
        <SpendBars rows={rows} selected={selected} onSelect={setSelected} />
        {period === "day" && (
          <>
            <S.CardTitle style={{ marginTop: 18 }}>누적 결제와 전월 비교</S.CardTitle>
            <S.Legend>
              <span><S.LegendKey $color={theme.chartHigh} />이번 달</span>
              <span><S.LegendKey $color={theme.mutedText} $dashed />지난달</span>
            </S.Legend>
            <CumulativeLines rows={daily} selected={selected} onSelect={setSelected} thisLabel="이번 달" prevLabel="지난달" />
          </>
        )}
        {selectedRow ? (
          <S.Detail>
            <S.Row>
              <strong style={{ fontSize: 14 }}>{period === "day" ? `${parseYm(ym).getMonth() + 1}월 ${selectedRow.day}일` : period === "week" ? `${selectedRow.label} 시작 주` : selectedRow.label}</strong>
              <strong style={{ fontSize: 15 }}>{won(selectedRow.spend)}</strong>
            </S.Row>
            {period === "day" && selectedRow.cum != null && (
              <S.Caption style={{ marginTop: 4 }}>
                이날까지 누적 {won(selectedRow.cum)}{selectedRow.prevCum != null ? ` · 지난달 같은 날 ${won(selectedRow.prevCum)}` : ""}
              </S.Caption>
            )}
            {period !== "day" && previousRow && (
              <div style={{ marginTop: 4 }}><DeltaText current={selectedRow.spend} previous={previousRow.spend} label={period === "week" ? "전주" : "전월"} /></div>
            )}
            {detailList.length > 0 && <div style={{ marginTop: 8 }}><TxList list={detailList.slice(0, 30)} onEdit={onEdit} /></div>}
            {detailList.length > 30 && <S.Caption>외 {detailList.length - 30}건</S.Caption>}
          </S.Detail>
        ) : (
          <S.Caption style={{ marginTop: 10 }}>막대나 선을 누르면 그날의 내역을 볼 수 있습니다.</S.Caption>
        )}
      </S.Card>

      <S.Card>
        <S.CardTitle>{parseYm(ym).getMonth() + 1}월 카테고리별 결제</S.CardTitle>
        {categories.length === 0 ? (
          <S.Caption>결제 내역이 없습니다.</S.Caption>
        ) : (
          <>
            <CategoryDoughnut rows={categories} />
            <div style={{ marginTop: 10 }}>
              {categories.map((r) => (
                <S.RankRow key={r.name}>
                  <div>
                    <span><S.Dot $color={categoryColor(r.name, theme)} />{r.name} · {Math.round((r.amount / categoryTotal) * 100)}%</span>
                    <span>{won(r.amount)}</span>
                  </div>
                </S.RankRow>
              ))}
            </div>
          </>
        )}
      </S.Card>

      <S.Card>
        <S.CardTitle>{parseYm(ym).getMonth() + 1}월 내역</S.CardTitle>
        {recent.length === 0 ? <S.Caption>아직 내역이 없습니다. 카카오뱅크 알림이 오면 자동으로 쌓이고, 위 버튼으로 직접 넣을 수도 있습니다.</S.Caption> : <TxList list={recent} onEdit={onEdit} />}
        {monthList.length > 30 && <S.Caption style={{ marginTop: 8 }}>최근 30건을 표시했습니다. 막대를 누르면 날짜별로 볼 수 있습니다.</S.Caption>}
      </S.Card>
    </>
  );
}
