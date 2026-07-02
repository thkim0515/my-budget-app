import { useEffect, useState, useMemo } from "react";
import { useTheme } from "styled-components";
import Header from "../../components/UI/Header";
import { formatCompact } from "../../utils/numberFormat";
import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { useSwipeable } from "react-swipeable";
import * as S from "./StatsPage.styles";

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function StatsPage() {
  const theme = useTheme();
  const [chapters, setChapters] = useState([]);
  const [records, setRecords] = useState([]);
  const { unit } = useCurrencyUnit();
  const [slide, setSlide] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [range, setRange] = useState(1);
  const { db, getAll } = useBudgetDB();

  // 데이터 로드 (사용자 수정 방식 유지 + ESLint 대응)
  useEffect(() => {
    if (!db) return;
    (async () => {
      const chData = await getAll("chapters");
      const rcData = await getAll("records");
      setChapters(chData);
      setRecords(rcData);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db]);

  // 날짜 범위 계산 (startDate, endDate)
  const { startDate, endDate } = useMemo(() => {
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const start = new Date(currentDate);
    start.setMonth(start.getMonth() - (range - 1));
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return { startDate: start, endDate: end };
  }, [currentDate, range]);

  // 기록 필터링 최적화 (useMemo)
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const rawDate = r.date || r.createdAt;
      if (!rawDate) return false;
      const rDate = new Date(rawDate);
      const recordDateOnly = new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate());
      return recordDateOnly >= startDate && recordDateOnly <= endDate;
    });
  }, [records, startDate, endDate]);

  // 요약 리스트 및 차트 데이터 계산 최적화 (가장 중요)
  const summaryList = useMemo(() => {
    const chapterMap = new Map();
    filteredRecords.forEach((r) => {
      if (r.excludedFromCalc) return;
      const key = r.chapterId;
      if (!chapterMap.has(key)) {
        chapterMap.set(key, { income: 0, expense: 0 });
      }
      const summary = chapterMap.get(key);
      summary[r.type] += r.amount;
    });

    const list = [];
    chapters.forEach((ch) => {
      const summary = chapterMap.get(ch.chapterId);
      if (summary && (summary.income > 0 || summary.expense > 0) && !ch.isTemporary) {
        list.push({
          title: ch.title,
          income: summary.income,
          expense: summary.expense,
          balance: summary.income - summary.expense,
        });
      }
    });

    return list.sort((a, b) => {
      const parseTitle = (t) => {
        const m = t.match(/(\d+)년\s+(\d+)월/);
        return m ? parseInt(m[1]) * 100 + parseInt(m[2]) : 0;
      };
      return parseTitle(a.title) - parseTitle(b.title);
    });
  }, [filteredRecords, chapters]);

  // 기간 합계 (수입/지출/잔액)
  const periodTotals = useMemo(() => {
    let income = 0, expense = 0;
    filteredRecords.forEach((r) => {
      if (r.excludedFromCalc) return;
      if (r.type === "income") income += r.amount;
      else expense += r.amount;
    });
    return { income, expense, balance: income - expense };
  }, [filteredRecords]);

  // 차트 객체 메모이제이션 (차트 깜빡임 및 성능 저하 방지)
  const barData = useMemo(() => ({
    labels: summaryList.map((s) => s.title),
    datasets: [{
      label: "잔액",
      data: summaryList.map((s) => s.balance),
      backgroundColor: summaryList.map((s) => (s.balance < 0 ? "rgba(245, 69, 92, 0.75)" : "rgba(76, 111, 255, 0.75)")),
      borderColor: summaryList.map((s) => (s.balance < 0 ? "#F5455C" : "#4C6FFF")),
      borderWidth: 1.5,
      borderRadius: 8,
      maxBarThickness: 48,
    }],
  }), [summaryList]);

  const pieData = useMemo(() => {
    const expenseList = filteredRecords.filter((r) => r.type === "expense" && !r.excludedFromCalc);
    const categorySum = {};
    expenseList.forEach((r) => {
      const key = r.category || "기타";
      categorySum[key] = (categorySum[key] || 0) + r.amount;
    });

    const labels = Object.keys(categorySum);
    const palette = ["#4C6FFF", "#6F5BFF", "#12B76A", "#F5455C", "#F59E0B", "#22C3E6", "#FF8A5B", "#9B6DFF", "#2BD67B", "#FF6B9D"];
    return {
      labels,
      datasets: [{
        label: "지출 합계",
        data: Object.values(categorySum),
        backgroundColor: labels.map((_, i) => palette[i % palette.length]),
        borderWidth: 0,
      }],
    };
  }, [filteredRecords]);

  // 이동 로직 
  const moveMonth = (delta) => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSlide(delta > 0 ? "slide-left" : "slide-right");
    setTimeout(() => {
      const newDate = new Date(currentDate);
      newDate.setMonth(currentDate.getMonth() + delta);
      setCurrentDate(newDate);
      setSlide("");
      setIsAnimating(false);
    }, 150);
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => moveMonth(range),
    onSwipedRight: () => moveMonth(-range),
    trackMouse: true,
  });

  const monthDisplay = range === 1
    ? `${startDate.getFullYear()}년 ${startDate.getMonth() + 1}월`
    : `${startDate.getFullYear()}년 ${startDate.getMonth() + 1}월 ~ ${endDate.getFullYear()}년 ${endDate.getMonth() + 1}월`;

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header title={range === 1 ? "월간 통계" : `통계 (${range}개월)`} />
      </S.HeaderFix>

      <S.Content {...handlers}>
        <div className={`slide-box ${slide}`}>
          <S.RangeSelector>
            {[1, 3, 6, 12].map((r) => (
              <S.RangeButton key={r} $active={range === r} onClick={() => setRange(r)}>
                {r}개월
              </S.RangeButton>
            ))}
          </S.RangeSelector>

          <S.MonthSelector>
            <S.ArrowBtn onClick={() => moveMonth(-range)}>‹</S.ArrowBtn>
            <span>{monthDisplay}</span>
            <S.ArrowBtn onClick={() => moveMonth(range)}>›</S.ArrowBtn>
          </S.MonthSelector>

          <S.SummaryCard>
            <S.SummaryCell $tone="income">
              <span>수입</span>
              <strong>{formatCompact(periodTotals.income)} {unit}</strong>
            </S.SummaryCell>
            <S.SummaryCell $tone="expense">
              <span>지출</span>
              <strong>{formatCompact(periodTotals.expense)} {unit}</strong>
            </S.SummaryCell>
            <S.SummaryCell>
              <span>잔액</span>
              <strong>{formatCompact(periodTotals.balance)} {unit}</strong>
            </S.SummaryCell>
          </S.SummaryCard>

          <S.ChartBox>
            <S.ChartTitle>제목별 잔액</S.ChartTitle>
            <Bar data={barData} options={barOptions(theme)} />
          </S.ChartBox>

          <S.ChartBox>
            <S.ChartTitle>카테고리별 지출</S.ChartTitle>
            <div style={{ height: "260px", display: "flex", justifyContent: "center" }}>
              <Pie data={pieData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </S.ChartBox>

          <S.Table>
            <thead>
              <tr>
                <S.Th>목록</S.Th>
                <S.Th>수입</S.Th>
                <S.Th>지출</S.Th>
                <S.Th>잔액</S.Th>
              </tr>
            </thead>
            <tbody>
              {summaryList.map((s, idx) => (
                <tr key={idx}>
                  <S.Td>{s.title}</S.Td>
                  <S.Td>{formatCompact(s.income)} {unit}</S.Td>
                  <S.Td>{formatCompact(s.expense)} {unit}</S.Td>
                  <S.Td>{formatCompact(s.balance)} {unit}</S.Td>
                </tr>
              ))}
            </tbody>
          </S.Table>
        </div>
      </S.Content>
    </S.PageWrap>
  );
}


const barOptions = (theme) => ({
  responsive: true,
  plugins: { legend: { labels: { color: theme.text } } },
  scales: {
    x: { ticks: { color: theme.text }, grid: { color: theme.border } },
    y: { ticks: { color: theme.text }, grid: { color: theme.border } },
  },
});