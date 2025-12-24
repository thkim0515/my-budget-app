import { useEffect, useState } from "react";
import Header from "../../components/Header";
import { formatCompact } from "../../utils/numberFormat";
import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { useSwipeable } from "react-swipeable";
import * as S from "./StatsPage.styles";

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";
import { Bar, Pie } from "react-chartjs-2";

// 차트 구성 요소를 등록 
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);


export default function StatsPage() {
  // 챕터와 모든 기록 상태를 관리 
  const [chapters, setChapters] = useState([]);
  const [records, setRecords] = useState([]);

  const { unit } = useCurrencyUnit();
  // 슬라이드 애니메이션 상태
  const [slide, setSlide] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  // 현재 월 (선택된 기간의 가장 마지막 월을 나타. 즉, 우측 끝 월)
  const [currentDate, setCurrentDate] = useState(new Date());
  // 기간 선택 상태 (1개월, 3개월, 6개월, 12개월 중 하나, 기본값 1개월)
  const [range, setRange] = useState(1);

  // DB 훅을 연결 
  const { db, getAll } = useBudgetDB();

  // DB 준비되면 데이터를 로드 
  useEffect(() => {
    if (db) {
      loadData();
    }
  }, [db]);

  // 모든 챕터와 기록을 DB에서 불러
  const loadData = async () => {
    setChapters(await getAll("chapters"));
    setRecords(await getAll("records"));
  };

  // 날짜 범위 계산 함수: 현재 월을 포함하여 'months' 기간의 시작일과 마지막 날을 반환 
  const getPeriod = (date, months) => {
    // 선택된 월의 마지막 날을 계산 (범위의 끝, 현재 날짜의 월말)
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // 선택된 월로부터 (months - 1)개월 이전의 1일을 계산 (범위의 시작, 과거)
    const startDate = new Date(date);
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0); // 시간 정보를 초기화하여 날짜 비교 오류를 방지 

    return { startDate, endDate };
  };

  // 기간 이동 함수: delta만큼 currentDate를 변경 
  const moveMonth = (delta) => {
    if (isAnimating) return;
    setIsAnimating(true);

    // 슬라이드 방향을 설정 
    setSlide(delta > 0 ? "slide-left" : "slide-right");

    setTimeout(() => {
      const newDate = new Date(currentDate);
      // delta만큼 월을 이동 
      newDate.setMonth(currentDate.getMonth() + delta);
      setCurrentDate(newDate);

      setSlide("");
      setIsAnimating(false);
    }, 150);
  };

  // 현재 선택된 기간에 해당하는 날짜 범위 (startDate ~ endDate)를 계산 
  const { startDate, endDate } = getPeriod(currentDate, range);

  // 해당 범위에 속하는 기록만 필터링  (과거부터 현재까지의 데이터를 포함)
  const filteredRecords = records.filter((r) => {
    if (!r.date) return false;

    const rDate = new Date(r.date);
    // 레코드의 날짜만 추출하여 정확한 비교를 수행 
    const recordDateOnly = new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate());

    // startDate 이상, endDate 이하의 레코드만 포함 
    return recordDateOnly >= startDate && recordDateOnly <= endDate;
  });

  // 챕터별 요약을 계산 
  const getSummaryByChapter = () => {
    const chapterMap = new Map();

    // 1. 현재 범위의 기록을 chapterId 별로 수입/지출 합산
    filteredRecords.forEach((r) => {
      const key = r.chapterId;
      if (!chapterMap.has(key)) {
        chapterMap.set(key, { income: 0, expense: 0, chapterId: key });
      }
      const summary = chapterMap.get(key);
      summary[r.type] += r.amount;
    });

    // 2. 전체 Chapter 목록 중 활동이 있는 챕터만 선택하여 최종 요약 목록 생성
    const summaryList = [];
    chapters.forEach((ch) => {
      const summary = chapterMap.get(ch.chapterId);

      // 해당 기간에 활동(수입 또는 지출)이 있고, 임시 챕터가 아닌 경우에만 표시
      if (summary && (summary.income > 0 || summary.expense > 0) && !ch.isTemporary) {
        summaryList.push({
          title: ch.title,
          income: summary.income,
          expense: summary.expense,
          balance: summary.income - summary.expense,
        });
      }
    });

    return summaryList;
  };

  const summaryList = getSummaryByChapter();

  summaryList.sort((a, b) => {
    const parseTitle = (title) => {
      const match = title.match(/(\d+)년\s+(\d+)월/);
      return match ? parseInt(match[1]) * 100 + parseInt(match[2]) : 0;
    };
    return parseTitle(a.title) - parseTitle(b.title);
  });

  // 제목별 잔액 BarChart 데이터
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

  // BarChart 옵션 설정
  const barOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: "#aaa" } },
    },
    scales: {
      x: {
        ticks: { color: "#aaa" },
        grid: { color: "#444" },
      },
      y: {
        ticks: { color: "#aaa" },
        grid: { color: "#444" },
      },
    },
  };

  // 카테고리별 지출 PieChart 데이터 계산
  const getCategoryData = () => {
    const expenseList = filteredRecords.filter((r) => r.type === "expense");

    const categorySum = {};

    expenseList.forEach((r) => {
      const key = r.category || "기타";
      categorySum[key] = (categorySum[key] || 0) + r.amount;
    });

    const labels = Object.keys(categorySum);
    const values = Object.values(categorySum);

    // 카테고리 개수만큼 HSL 색상 생성하여 차트 색상을 지정
    const backgroundColors = labels.map((_, index) => {
      const hue = (index * 360) / labels.length;
      return `hsl(${hue}, 65%, 60%)`;
    });

    return {
      labels,
      datasets: [
        {
          label: "지출 합계",
          data: values,
          backgroundColor: backgroundColors,
        },
      ],
    };
  };

  // 스와이프 제스처 핸들러 (선택된 기간만큼 이동)
  const handlers = useSwipeable({
    onSwipedLeft: () => moveMonth(range),
    onSwipedRight: () => moveMonth(-range),
    trackMouse: true,
  });

  // MonthSelector에 표시할 텍스트를 구성 
  const monthDisplay =
    range === 1
      ? `${startDate.getFullYear()}년 ${startDate.getMonth() + 1}월` // 1개월은 단일 월만 표시
      : `${startDate.getFullYear()}년 ${startDate.getMonth() + 1}월 ~ ${endDate.getFullYear()}년 ${endDate.getMonth() + 1}월`; // 다중 개월은 시작월과 끝월을 표시 (과거 -> 현재/미래 순서)

  return (
    <S.PageWrap>
      <S.HeaderFix>
        {/* 헤더 제목: 선택된 기간에 따라 동적으로 변경 */}
        <Header title={range === 1 ? "월간 통계" : `통계 (${range}개월)`} />
      </S.HeaderFix>

      <S.Content {...handlers}>
        <div className={`slide-box ${slide}`}>
          {/* 기간 선택 버튼 UI */}
          <S.RangeSelector>
            {[1, 3, 6, 12].map((r) => (
              <S.RangeButton
                key={r}
                $active={range === r} // 현재 선택된 기간인지 표시
                onClick={() => setRange(r)} // 클릭 시 기간 변경
              >
                {r}개월
              </S.RangeButton>
            ))}
          </S.RangeSelector>

          <S.MonthSelector>
            {/* 이전 기간으로 이동하는 버튼 (선택된 기간(range)만큼 이동) */}
            <S.ArrowBtn onClick={() => moveMonth(-range)}>◀</S.ArrowBtn>

            {/* 계산된 기간을 '과거 → 현재/미래' 순서로 표시 */}
            <span>{monthDisplay}</span>

            {/* 다음 기간으로 이동하는 버튼 (선택된 기간(range)만큼 이동) */}
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
              {summaryList.map((s, idx) => (
                <tr key={idx}>
                  <S.Td>{s.title}</S.Td>
                  <S.Td>
                    {formatCompact(s.income)} {unit}
                  </S.Td>
                  <S.Td>
                    {formatCompact(s.expense)} {unit}
                  </S.Td>
                  <S.Td>
                    {formatCompact(s.balance)} {unit}
                  </S.Td>
                </tr>
              ))}
            </tbody>
          </S.Table>
        </div>
      </S.Content>
    </S.PageWrap>
  );
}
