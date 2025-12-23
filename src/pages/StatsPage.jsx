import { useEffect, useState } from "react";
import styled from "styled-components";
import Header from "../components/Header";
import { formatCompact } from "../utils/numberFormat";
import { useCurrencyUnit } from "../hooks/useCurrencyUnit";
import { useBudgetDB } from "../hooks/useBudgetDB";
import { useSwipeable } from "react-swipeable";

import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from "chart.js";

import { Bar, Pie } from "react-chartjs-2";

// 차트 구성 요소를 등록합니다.
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// ────────────────────────────── 스타일 ──────────────────────────────
const PageWrap = styled.div`
  /* 페이지의 최대 너비를 설정하여 모바일 뷰를 유지합니다. */
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  color: ${({ theme }) => theme.text};
`;

const HeaderFix = styled.div`
  /* 헤더를 상단에 고정합니다. */
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: 480px;
  z-index: 20;
`;

const Content = styled.div`
  /* 스크롤 가능한 본문 영역입니다. */
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-top: 96px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));

  width: 100%;
  max-width: 480px;
  margin: 0 auto;

  .slide-box {
    transition: transform 0.15s ease, opacity 0.15s ease;
  }

  .slide-left {
    transform: translateX(-50px);
    opacity: 0;
  }

  .slide-right {
    transform: translateX(50px);
    opacity: 0;
  }
`;

const ChartBox = styled.div`
  /* 차트를 감싸는 카드 스타일입니다. */
  margin-top: 20px;
  background: ${({ theme }) => theme.card};
  padding: 20px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.border};
`;

const Table = styled.table`
  /* 챕터별 요약 테이블 스타일입니다. */
  width: 100%;
  margin-top: 20px;
  border-collapse: collapse;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  overflow: hidden;
`;

const Th = styled.th`
  /* 테이블 헤더 스타일입니다. */
  padding: 12px 8px;
  background: ${({ theme }) => theme.headerBg};
  color: ${({ theme }) => theme.headerText};
  text-align: center;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const Td = styled.td`
  /* 테이블 데이터 셀 스타일입니다. */
  padding: 12px 8px;
  text-align: center;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.text};
  &:last-child {
    font-weight: bold;
  }
`;

const MonthSelector = styled.div`
  /* 기간 표시 및 좌우 이동 버튼 레이아웃입니다. */
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: bold;
`;

const ArrowBtn = styled.button`
  /* 월 이동 버튼 스타일입니다. */
  background: transparent;
  border: none;
  font-size: 22px;
  color: ${({ theme }) => theme.text};
  cursor: pointer;
`;

// 기간 선택 버튼을 위한 스타일 추가
const RangeSelector = styled.div`
  /* 1/3/6/12개월 선택 버튼 레이아웃입니다. */
  display: flex;
  justify-content: space-around;
  gap: 8px;
  margin-bottom: 20px;
`;

const RangeButton = styled.button`
  /* 기간 선택 버튼의 기본 스타일 및 활성화 상태 스타일입니다. */
  padding: 8px 12px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border};
  /* $active는 styled-components에서 transient prop으로 처리되어 DOM에 전달되지 않습니다. */
  background: ${({ theme, $active }) => ($active ? theme.headerBg : theme.card)};
  color: ${({ theme, $active }) => ($active ? theme.headerText : theme.text)};
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 0;
`;

// ────────────────────────────── PAGE ──────────────────────────────

export default function StatsPage() {
  // 챕터와 모든 기록 상태를 관리합니다.
  const [chapters, setChapters] = useState([]);
  const [records, setRecords] = useState([]);

  const { unit } = useCurrencyUnit();
  // 슬라이드 애니메이션 상태입니다.
  const [slide, setSlide] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  // 현재 월 (선택된 기간의 가장 마지막 월을 나타냅니다. 즉, 우측 끝 월)
  const [currentDate, setCurrentDate] = useState(new Date());
  // 기간 선택 상태 (1개월, 3개월, 6개월, 12개월 중 하나, 기본값 1개월)
  const [range, setRange] = useState(1);

  // DB 훅을 연결합니다.
  const { db, getAll } = useBudgetDB();

  // DB 준비되면 데이터를 로드합니다.
  useEffect(() => {
    if (db) {
      loadData();
    }
  }, [db]);

  // 모든 챕터와 기록을 DB에서 불러옵니다.
  const loadData = async () => {
    setChapters(await getAll("chapters"));
    setRecords(await getAll("records"));
  };

  // 날짜 범위 계산 함수: 현재 월을 포함하여 'months' 기간의 시작일과 마지막 날을 반환합니다.
  const getPeriod = (date, months) => {
    // 선택된 월의 마지막 날을 계산 (범위의 끝, 현재 날짜의 월말)
    const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);

    // 선택된 월로부터 (months - 1)개월 이전의 1일을 계산 (범위의 시작, 과거)
    const startDate = new Date(date);
    startDate.setMonth(startDate.getMonth() - (months - 1));
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0); // 시간 정보를 초기화하여 날짜 비교 오류를 방지합니다.

    return { startDate, endDate };
  };

  // 기간 이동 함수: delta만큼 currentDate를 변경합니다.
  const moveMonth = (delta) => {
    if (isAnimating) return;
    setIsAnimating(true);

    // 슬라이드 방향을 설정합니다.
    setSlide(delta > 0 ? "slide-left" : "slide-right");

    setTimeout(() => {
      const newDate = new Date(currentDate);
      // delta만큼 월을 이동합니다.
      newDate.setMonth(currentDate.getMonth() + delta);
      setCurrentDate(newDate);

      setSlide("");
      setIsAnimating(false);
    }, 150);
  };

  // 현재 선택된 기간에 해당하는 날짜 범위 (startDate ~ endDate)를 계산합니다.
  const { startDate, endDate } = getPeriod(currentDate, range);

  // 해당 범위에 속하는 기록만 필터링합니다. (과거부터 현재까지의 데이터를 포함)
  const filteredRecords = records.filter((r) => {
    if (!r.date) return false;

    const rDate = new Date(r.date);
    // 레코드의 날짜만 추출하여 정확한 비교를 수행합니다.
    const recordDateOnly = new Date(rDate.getFullYear(), rDate.getMonth(), rDate.getDate());

    // startDate 이상, endDate 이하의 레코드만 포함합니다.
    return recordDateOnly >= startDate && recordDateOnly <= endDate;
  });

  // 챕터별 요약을 계산합니다.
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

  // MonthSelector에 표시할 텍스트를 구성합니다.
  const monthDisplay =
    range === 1
      ? `${startDate.getFullYear()}년 ${startDate.getMonth() + 1}월` // 1개월은 단일 월만 표시
      : `${startDate.getFullYear()}년 ${startDate.getMonth() + 1}월 ~ ${endDate.getFullYear()}년 ${endDate.getMonth() + 1}월`; // 다중 개월은 시작월과 끝월을 표시 (과거 -> 현재/미래 순서)

  return (
    <PageWrap>
      <HeaderFix>
        {/* 헤더 제목: 선택된 기간에 따라 동적으로 변경 */}
        <Header title={range === 1 ? "월간 통계" : `통계 (${range}개월)`} />
      </HeaderFix>

      <Content {...handlers}>
        <div className={`slide-box ${slide}`}>
          {/* 기간 선택 버튼 UI */}
          <RangeSelector>
            {[1, 3, 6, 12].map((r) => (
              <RangeButton
                key={r}
                $active={range === r} // 현재 선택된 기간인지 표시
                onClick={() => setRange(r)} // 클릭 시 기간 변경
              >
                {r}개월
              </RangeButton>
            ))}
          </RangeSelector>

          <MonthSelector>
            {/* 이전 기간으로 이동하는 버튼 (선택된 기간(range)만큼 이동) */}
            <ArrowBtn onClick={() => moveMonth(-range)}>◀</ArrowBtn>

            {/* 계산된 기간을 '과거 → 현재/미래' 순서로 표시 */}
            <span>{monthDisplay}</span>

            {/* 다음 기간으로 이동하는 버튼 (선택된 기간(range)만큼 이동) */}
            <ArrowBtn onClick={() => moveMonth(range)}>▶</ArrowBtn>
          </MonthSelector>

          <ChartBox>
            <h3>제목별 잔액 (Bar)</h3>
            <Bar data={barData} options={barOptions} />
          </ChartBox>

          <ChartBox>
            <h3>카테고리별 지출 (Pie)</h3>
            <div style={{ height: "260px", display: "flex", justifyContent: "center" }}>
              <Pie data={getCategoryData()} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </ChartBox>

          <Table>
            <thead>
              <tr>
                <Th>대제목</Th>
                <Th>수입</Th>
                <Th>지출</Th>
                <Th>잔액</Th>
              </tr>
            </thead>
            <tbody>
              {summaryList.map((s, idx) => (
                <tr key={idx}>
                  <Td>{s.title}</Td>
                  <Td>
                    {formatCompact(s.income)} {unit}
                  </Td>
                  <Td>
                    {formatCompact(s.expense)} {unit}
                  </Td>
                  <Td>
                    {formatCompact(s.balance)} {unit}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Content>
    </PageWrap>
  );
}
