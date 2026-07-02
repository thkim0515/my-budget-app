import { useEffect, useState, useCallback, useMemo } from "react";
import Header from "../../components/UI/Header";
import { formatNumber } from "../../utils/numberFormat";
import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { useSwipeable } from "react-swipeable";

import * as S from "./StatsBySourcePage.styles";

export default function StatsBySourcePage() {
  const [records, setRecords] = useState([]);
  const [sortMode, setSortMode] = useState(0); // 0=기본, 1=내림차순, 2=오름차순
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slide, setSlide] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  const { unit } = useCurrencyUnit();
  const { db, getAll } = useBudgetDB();

  const load = useCallback(async () => {
    const rec = await getAll("records");
    setRecords(rec);
  }, [getAll]);

  useEffect(() => {
    if (db) load();
  }, [db, load]);

  const changeMonth = useCallback((dir) => {
    if (isAnimating) return;
    setSlide(dir > 0 ? "slide-left" : "slide-right");
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentDate((prev) => {
        const d = new Date(prev);
        d.setMonth(d.getMonth() + dir);
        return d;
      });
      setSlide("");
      setIsAnimating(false);
    }, 150);
  }, [isAnimating]);

  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => changeMonth(1),
    onSwipedRight: () => changeMonth(-1),
    trackMouse: false,
  });

  const filteredRecords = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return records.filter((r) => {
      const rawDate = r.date || r.createdAt;
      if (!rawDate) return false;
      const d = new Date(rawDate);
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [records, currentDate]);

  const grouped = filteredRecords
    .filter((r) => r.type === "expense" && !r.excludedFromCalc)
    .reduce((acc, cur) => {
      const key = cur.source || "출처 없음";
      acc[key] = (acc[key] || 0) + cur.amount;
      return acc;
    }, {});

  let summary = Object.entries(grouped).map(([source, total]) => ({ source, total }));

  // 기본 정렬은 큰 금액 순으로 보여줘야 막대 그래프가 자연스럽다.
  if (sortMode === 2) {
    summary.sort((a, b) => a.total - b.total);
  } else {
    summary.sort((a, b) => b.total - a.total);
  }

  const totalExpense = summary.reduce((a, b) => a + b.total, 0);
  const maxTotal = summary.reduce((m, s) => Math.max(m, s.total), 0) || 1;

  const onSortClick = () => setSortMode((prev) => (prev + 1) % 3);
  const sortLabel = sortMode === 2 ? "오름차순 ↑" : "내림차순 ↓";

  const monthLabel = `${currentDate.getFullYear()}년 ${currentDate.getMonth() + 1}월`;

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header title="출처별 지출" />
      </S.HeaderFix>

      <S.Content {...swipeHandlers}>
        <S.MonthSelector>
          <S.ArrowBtn onClick={() => changeMonth(-1)}>‹</S.ArrowBtn>
          <span>{monthLabel}</span>
          <S.ArrowBtn onClick={() => changeMonth(1)}>›</S.ArrowBtn>
        </S.MonthSelector>

        <div className={`slide-box ${slide}`}>
          <S.TotalCard>
            <span>이 달 총 지출</span>
            <strong>{formatNumber(totalExpense)} {unit}</strong>
            <small>출처 {summary.length}곳</small>
          </S.TotalCard>

          {summary.length === 0 ? (
            <S.EmptyState>이 달의 지출 내역이 없습니다</S.EmptyState>
          ) : (
            <>
              <S.SortBar>
                <S.SortBtn onClick={onSortClick}>정렬 · {sortLabel}</S.SortBtn>
              </S.SortBar>
              <S.List>
                {summary.map((item, idx) => {
                  const pct = Math.round((item.total / maxTotal) * 100);
                  const share = totalExpense > 0 ? Math.round((item.total / totalExpense) * 100) : 0;
                  return (
                    <S.SourceCard key={item.source}>
                      <S.SourceTop>
                        <S.SourceName>
                          <S.Rank $top={idx === 0 && sortMode !== 2}>{idx + 1}</S.Rank>
                          {item.source}
                        </S.SourceName>
                        <S.SourceAmount>{formatNumber(item.total)} {unit}</S.SourceAmount>
                      </S.SourceTop>
                      <S.BarTrack>
                        <S.BarFill $pct={pct} />
                      </S.BarTrack>
                      <S.SubMeta>전체의 {share}%</S.SubMeta>
                    </S.SourceCard>
                  );
                })}
              </S.List>
            </>
          )}
        </div>
      </S.Content>
    </S.PageWrap>
  );
}
