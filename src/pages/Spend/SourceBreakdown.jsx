import { useTheme } from "styled-components";
import { byCategory, byMerchant } from "../../utils/kakaoStats";
import { bucketSeries, txsOfSource } from "../../utils/spendStats";
import { SpendBars, categoryColor, won } from "../Kakao/KakaoCharts";
import * as S from "../Kakao/KakaoPage.styles";

export function RankBars({ rows, colorOf, unit = "건" }) {
  const theme = useTheme();
  const max = rows[0]?.amount || 1;
  if (rows.length === 0) return <S.Caption>결제 내역이 없습니다.</S.Caption>;
  return rows.map((r) => (
    <S.RankRow key={r.name}>
      <div><span>{r.name} · {r.count}{unit}</span><span>{won(r.amount)}</span></div>
      <S.Bar $pct={(r.amount / max) * 100} $color={colorOf ? colorOf(r.name) : theme.primary} />
    </S.RankRow>
  ));
}

function SourceDetail({ list, period }) {
  const theme = useTheme();
  return (
    <S.Detail style={{ marginTop: 0, marginBottom: 8 }}>
      <S.CardTitle style={{ fontSize: 14, marginBottom: 8 }}>일별 추이</S.CardTitle>
      <SpendBars rows={bucketSeries(list, period, "day")} height={140} />
      <S.CardTitle style={{ fontSize: 14, margin: "14px 0 4px" }}>카테고리별</S.CardTitle>
      <RankBars rows={byCategory(list)} colorOf={(name) => categoryColor(name, theme)} />
      <S.CardTitle style={{ fontSize: 14, margin: "14px 0 4px" }}>가맹점 상위 5곳</S.CardTitle>
      <RankBars rows={byMerchant(list).slice(0, 5)} />
    </S.Detail>
  );
}

// 금융사별 합계·건수·비중. 한 곳을 누르면 바로 아래에 그 금융사만의 분석을 펼친다.
export default function SourceBreakdown({ rows, list, period, activeId, onPick }) {
  const theme = useTheme();
  const activeShown = rows.some((r) => r.id === activeId && r.amount > 0);
  return (
    <S.Card>
      <S.CardTitle>금융사별</S.CardTitle>
      {rows.length === 0 && <S.Caption>결제 내역이 없습니다.</S.Caption>}
      {rows.map((r) => {
        const open = activeShown && r.id === activeId;
        return (
          <div key={r.id}>
            <S.SourceRow type="button" $active={open} disabled={r.amount <= 0} aria-expanded={open} onClick={() => onPick(open ? null : r.id)}>
              <div>
                <span>{r.name} · {r.count}건 · {Math.round(r.share * 100)}%</span>
                <span>{won(r.amount)}</span>
              </div>
              <S.Bar $pct={r.share * 100} $color={activeShown && !open ? theme.chartDim : theme.chartHigh} />
            </S.SourceRow>
            {open && <SourceDetail list={txsOfSource(list, r.id)} period={period} />}
          </div>
        );
      })}
      {rows.length > 0 && !activeShown && <S.Caption style={{ marginTop: 6 }}>금융사를 누르면 그곳의 카테고리·가맹점·일별 추이를 볼 수 있습니다.</S.Caption>}
    </S.Card>
  );
}
