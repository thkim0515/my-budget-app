import { useState, useEffect } from "react";
import styled from "styled-components";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import Header from "../components/Header";
import { useBudgetDB } from "../hooks/useBudgetDB";
import { formatNumber, formatCompact } from "../utils/numberFormat";
import { useCurrencyUnit } from "../hooks/useCurrencyUnit";
import { useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import Holidays from "date-holidays";

/* 공휴일 초기화 */
const hd = new Holidays("KR");

/* ───────────── Layout ───────────── */
const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
`;

const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  max-width: 480px;
  margin: 0 auto;
  z-index: 20;
`;

const Content = styled.div`
  flex: 1;
  padding: 16px;
  padding-top: 96px;
  padding-bottom: 140px;
  overflow-y: auto;
  color: ${({ theme }) => theme.text};

  /* 캘린더 */
  .react-calendar {
    background: ${({ theme }) => theme.card};
    border: 1px solid ${({ theme }) => theme.border};
    border-radius: 10px;
    padding: 8px;
    width: 100%;
  }

  .react-calendar__navigation button {
    color: ${({ theme }) => theme.text};
  }

  .react-calendar__month-view__weekdays__weekday {
    text-align: center;
    font-weight: bold;
  }

  /* 요일 헤더 */
  .react-calendar__month-view__weekdays__weekday:nth-child(1) {
    color: #e74c3c;
  }

  .react-calendar__month-view__weekdays__weekday:nth-child(7) {
    color: #3498db;
  }

  /* 날짜 타일 */
  .react-calendar__tile {
    background: transparent !important;
    border-radius: 6px;
    min-height: 75px;
    padding: 4px;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
  }

  /* 오늘 날짜 */
  .react-calendar__tile--now abbr {
    color: ${({ theme }) => theme.text} !important;
    font-weight: bold;
  }

  /* 공휴일 */
  .day-holiday abbr {
    color: #e74c3c !important;
    font-weight: bold !important;
  }

  /* 일요일 */
  .day-sun abbr {
    color: #e74c3c !important;
  }

  /* 토요일 */
  .day-sat abbr {
    color: #3498db !important;
  }

  /* 평일 */
  .day-weekday abbr {
    color: ${({ theme }) => theme.text} !important;
  }

  /* 선택된 날짜 */
  .selected-tile {
    background: ${({ theme }) => theme.activeBg} !important;
    border: 1px solid ${({ theme }) => theme.activeText};
  }

  .selected-tile abbr {
    color: ${({ theme }) => theme.activeText} !important;
    font-weight: bold !important;
  }
`;

const AmountBox = styled.div`
  font-size: 10px;
  margin-top: 2px;
  text-align: center;
`;

const SummaryBox = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  margin-bottom: 20px;
  padding: 16px;
  border-radius: 8px;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 6px;
`;

const DetailBox = styled.div`
  margin-top: 20px;
`;

const Card = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
`;

const Title = styled.div`
  font-size: 14px;
  margin-bottom: 6px;
`;

const Amount = styled.div`
  font-size: 16px;
  font-weight: bold;
  color: ${({ type }) => (type === "income" ? "#2ecc71" : "#e74c3c")};
`;

/* 날짜 KEY */
const formatDateKey = (d) =>
  d
    .toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .replace(/\. /g, "-")
    .replace(".", "");

export default function CalendarStatsPage() {
  const { db, getAll } = useBudgetDB();
  const { unit } = useCurrencyUnit();
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (db) load();
  }, [db]);

  const load = async () => {
    const rec = await getAll("records");
    setRecords(rec);
  };

  /* 월 데이터 필터 */
  const filtered = records.filter((r) => {
    const d = new Date(r.date || r.createdAt);
    return d.getFullYear() === selectedMonth.getFullYear() && d.getMonth() === selectedMonth.getMonth();
  });

  /* 날짜별 금액 */
  const dailyTotals = {};
  filtered.forEach((r) => {
    const key = formatDateKey(new Date(r.date || r.createdAt));
    if (!dailyTotals[key]) dailyTotals[key] = { income: 0, expense: 0 };
    dailyTotals[key][r.type] += r.amount;
  });

  /* 타일 금액 표시 */
  const tileContent = ({ date, view }) => {
    if (view !== "month") return null;
    const key = formatDateKey(date);
    const data = dailyTotals[key];
    return (
      <AmountBox>
        {data?.income > 0 && <div style={{ color: "#2ecc71" }}>+{formatCompact(data.income)}</div>}
        {data?.expense > 0 && <div style={{ color: "#e74c3c" }}>-{formatCompact(data.expense)}</div>}
      </AmountBox>
    );
  };

  /* 날짜 스타일 */  
  const tileClassName = ({ date, view }) => {
    if (view !== "month") return "";

    const isHoliday = hd.isHoliday(date);
    if (isHoliday) return "day-holiday";

    const day = date.getDay();
    if (day === 0) return "day-sun";
    if (day === 6) return "day-sat";

    const key1 = formatDateKey(date);
    const key2 = formatDateKey(selectedDate);

    if (key1 === key2) return "selected-tile";

    return "day-weekday";
  };

  /* 요일표시 */
  const formatShortWeekday = (_, date) =>
    ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];

  /* 선택된 날짜 상세 */
  const selectedKey = selectedDate ? formatDateKey(selectedDate) : null;
  const selectedList = selectedKey
    ? filtered.filter((r) => formatDateKey(new Date(r.date || r.createdAt)) === selectedKey)
    : [];

  /* 스와이프 */
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      const next = new Date(selectedMonth);
      next.setMonth(selectedMonth.getMonth() + 1);
      setSelectedMonth(next);
    },
    onSwipedRight: () => {
      const prev = new Date(selectedMonth);
      prev.setMonth(selectedMonth.getMonth() - 1);
      setSelectedMonth(prev);
    },
    trackMouse: true,
  });

  return (
    <PageWrap>
      <HeaderFix>
        <Header title="월간 수입·지출 캘린더" />
      </HeaderFix>

      <Content>
        <SummaryBox>
          <Row>
            <span>총 수입</span>
            <span>{formatNumber(filtered.filter(r=>r.type==="income").reduce((a,b)=>a+b.amount,0))} {unit}</span>
          </Row>
          <Row>
            <span>총 지출</span>
            <span>{formatNumber(filtered.filter(r=>r.type==="expense").reduce((a,b)=>a+b.amount,0))} {unit}</span>
          </Row>
        </SummaryBox>

        <div {...handlers}>
          <Calendar
            key={selectedMonth.toISOString()}
            locale="ko-KR"
            calendarType="gregory"
            formatShortWeekday={formatShortWeekday}
            onClickDay={(value) => setSelectedDate(value)}
            onActiveStartDateChange={(v) => setSelectedMonth(v.activeStartDate)}
            value={selectedMonth}
            tileContent={tileContent}
            tileClassName={tileClassName}
          />
        </div>

        {selectedList.length > 0 && (
          <DetailBox>
            <h3>{selectedKey} 상세 내역</h3>
            {selectedList.map((r) => (
              <Card
                key={r.id}
                onClick={() => navigate(`/detail/${selectedKey}/${r.id}`)}
                style={{ cursor: "pointer" }}
              >
                <Title>[{r.type === "income" ? "수입" : "지출"}] {r.title}</Title>
                <Amount type={r.type}>
                  {r.type === "income" ? "+" : "-"}
                  {formatNumber(r.amount)} {unit}
                </Amount>
              </Card>
            ))}
          </DetailBox>
        )}
      </Content>
    </PageWrap>
  );
}
