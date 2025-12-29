import { useEffect, useState, useMemo } from "react"; 
import Header from "../../components/Header";
import { formatCompact } from "../../utils/numberFormat";
import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { useSwipeable } from "react-swipeable";
import * as S from "./StatsPage.styles";

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function StatsPage() {
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
      if (!r.date) return false;
      const rDate = new Date(r.date);
      const recordDateOnly = new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate());
      return recordDateOnly >= startDate && recordDateOnly <= endDate;
    });
  }, [records, startDate, endDate]);

  // 요약 리스트 및 차트 데이터 계산 최적화 (가장 중요)
  const summaryList = useMemo(() => {
    const chapterMap = new Map();
    filteredRecords.forEach((r) => {
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

  // 차트 객체 메모이제이션 (차트 깜빡임 및 성능 저하 방지)
  const barData = useMemo(() => ({
    labels: summaryList.map((s) => s.title),
    datasets: [{
      label: "잔액",
      data: summaryList.map((s) => s.balance),
      backgroundColor: "rgba(25, 118, 210, 0.6)",
      borderColor: "rgba(25, 118, 210, 1)",
      borderWidth: 1,
    }],
  }), [summaryList]);

  const pieData = useMemo(() => {
    const expenseList = filteredRecords.filter((r) => r.type === "expense");
    const categorySum = {};
    expenseList.forEach((r) => {
      const key = r.category || "기타";
      categorySum[key] = (categorySum[key] || 0) + r.amount;
    });

    const labels = Object.keys(categorySum);
    return {
      labels,
      datasets: [{
        label: "지출 합계",
        data: Object.values(categorySum),
        backgroundColor: labels.map((_, i) => `hsl(${(i * 360) / labels.length}, 65%, 60%)`),
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
            <S.ArrowBtn onClick={() => moveMonth(-range)}>◀</S.ArrowBtn>
            <span>{monthDisplay}</span>
            <S.ArrowBtn onClick={() => moveMonth(range)}>▶</S.ArrowBtn>
          </S.MonthSelector>

          <S.ChartBox>
            <h3>제목별 잔액 (Bar)</h3>
            <Bar data={barData} options={barOptions} />
          </S.ChartBox>

          <S.ChartBox>
            <h3>카테고리별 지출 (Pie)</h3>
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


const barOptions = {
  responsive: true,
  plugins: { legend: { labels: { color: "#aaa" } } },
  scales: {
    x: { ticks: { color: "#aaa" }, grid: { color: "#444" } },
    y: { ticks: { color: "#aaa" }, grid: { color: "#444" } },
  },
};