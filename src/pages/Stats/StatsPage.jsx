import { useEffect, useState, useCallback } from "react";
import Header from "../../components/Header";
import { formatCompact } from "../../utils/numberFormat";
import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { useSwipeable } from "react-swipeable";
import * as S from "./StatsPage.styles";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

// 차트 구성 요소를 등록
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

export default function StatsPage() {
  // 챕터와 모든 기록 상태
  const [chapters, setChapters] = useState([]);
  const [records, setRecords] = useState([]);

  const { unit } = useCurrencyUnit();

  // 슬라이드 애니메이션 상태
  const [slide, setSlide] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  // 현재 기준 월
  const [currentDate, setCurrentDate] = useState(new Date());

  // 기간 선택 (1, 3, 6, 12개월)
  const [range, setRange] = useState(1);

  // DB 훅
  const { db, getAll } = useBudgetDB();

  // 모든 챕터와 기록을 DB에서 불러오는 함수 (Hooks 규칙 대응)
  const loadData = useCallback(async () => {
    const [chapterData, recordData] = await Promise.all([
      getAll("chapters"),
      getAll("records"),
    ]);
    setChapters(chapterData);
    setRecords(recordData);
  }, [getAll]);

  // DB 준비되면 데이터 로드
  useEffect(() => {
    if (db) {
      loadData();
    }
  }, [db, loadData]);

  // 날짜 범위 계산
  const getPeriod = (date, months) => {
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    const startDate = new Date(date);
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    return { startDate, endDate };
  };

  // 기간 이동
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

  // 선택된 기간의 날짜 범위
  const { startDate, endDate } = getPeriod(currentDate, range);

  // 기간 내 기록 필터링
  const filteredRecords = records.filter((r) => {
    if (!r.date) return false;

    const d = new Date(r.date);
    const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());

    return dateOnly >= startDate && dateOnly <= endDate;
  });

  // 챕터별 요약 계산
  const getSummaryByChapter = () => {
    const map = new Map();

    filteredRecords.forEach((r) => {
      if (!map.has(r.chapterId)) {
        map.set(r.chapterId, { income: 0, expense: 0 });
      }
      map.get(r.chapterId)[r.type] += r.amount;
    });

    return chapters
      .filter((ch) => !ch.isTemporary && map.has(ch.chapterId))
      .map((ch) => {
        const s = map.get(ch.chapterId);
        return {
          title: ch.title,
          income: s.income,
          expense: s.expense,
          balance: s.income - s.expense,
        };
      });
  };

  const summaryList = getSummaryByChapter();

  summaryList.sort((a, b) => {
    const parse = (title) => {
      const m = title.match(/(\d+)년\s+(\d+)월/);
      return m ? Number(m[1]) * 100 + Number(m[2]) : 0;
    };
    return parse(a.title) - parse(b.title);
  });

  // Bar 차트 데이터
  const barData = {
    labels: summaryList.map((s) => s.title),
    datasets: [
      {
        label: "잔액",
        data: summaryList.map((s) => s.balance),
        backgroundColor: "rgba(25, 118, 210, 0.6)",
        borderColor: "rgba(25, 118, 210, 1)",
        borderWidth: 1,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: "#aaa" } } },
    scales: {
      x: { ticks: { color: "#aaa" }, grid: { color: "#444" } },
      y: { ticks: { color: "#aaa" }, grid: { color: "#444" } },
    },
  };

  // 카테고리별 지출 Pie 데이터
  const getCategoryData = () => {
    const sum = {};
    filteredRecords
      .filter((r) => r.type === "expense")
      .forEach((r) => {
        sum[r.category || "기타"] = (sum[r.category || "기타"] || 0) + r.amount;
      });

    const labels = Object.keys(sum);
    const values = Object.values(sum);

    return {
      labels,
      datasets: [
        {
          label: "지출 합계",
          data: values,
          backgroundColor: labels.map(
            (_, i) => `hsl(${(i * 360) / labels.length}, 65%, 60%)`
          ),
        },
      ],
    };
  };

  // 스와이프 핸들러
  const handlers = useSwipeable({
    onSwipedLeft: () => moveMonth(range),
    onSwipedRight: () => moveMonth(-range),
    trackMouse: true,
  });

  const monthDisplay =
    range === 1
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
              <Pie data={getCategoryData()} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </S.ChartBox>

          <S.Table>
            <thead>
              <tr>
                <S.Th>대제목</S.Th>
                <S.Th>수입</S.Th>
                <S.Th>지출</S.Th>
                <S.Th>잔액</S.Th>
              </tr>
            </thead>
            <tbody>
              {summaryList.map((s, i) => (
                <tr key={i}>
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
