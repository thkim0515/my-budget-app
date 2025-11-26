import { useState, useEffect } from "react";
import styled from "styled-components";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import Header from "../components/Header";
import { useBudgetDB } from "../hooks/useBudgetDB";
import { formatNumber } from "../utils/numberFormat";
import { useCurrencyUnit } from "../hooks/useCurrencyUnit";

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

  /* 일요일 빨강 */
  .react-calendar__month-view__weekdays__weekday:nth-child(1) {
    color: #e74c3c;
  }

  /* 토요일 파랑 */
  .react-calendar__month-view__weekdays__weekday:nth-child(7) {
    color: #3498db;
  }

  /* 타일 디자인 */
  .react-calendar__tile {
    background: transparent !important;
    border-radius: 0 !important;
    min-height: 72px;
    padding: 4px;
    position: relative;
    display: flex;
    justify-content: flex-start;
    flex-direction: column;
    transition: background 0.2s ease;
  }

  .react-calendar__tile--now {
    background: transparent !important;
  }

  /* 선택된 날짜 효과 */
  .selected-tile {
    background: ${({ theme }) => theme.activeBg} !important;
    border-radius: 6px !important;
    border: 1px solid ${({ theme }) => theme.activeText} !important;
    animation: fadeIn 0.2s ease;
  }

  @keyframes fadeIn {
    from {
      transform: scale(0.95);
      opacity: 0.5;
    }
    to {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* 이웃 달 */
  .react-calendar__month-view__days__day--neighboringMonth {
    opacity: 0.25;
  }
`;

const AmountBox = styled.div`
  font-size: 10px;
  margin-top: 2px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
  padding: 14px;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
`;

export default function CalendarStatsPage() {
  const { db, getAll } = useBudgetDB();
  const { unit } = useCurrencyUnit();

  const [records, setRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (db) load();
  }, [db]);

  const load = async () => {
    const rec = await getAll("records");
    setRecords(rec);
  };

  /* ───── 월 필터 ───── */
  const filtered = records.filter((r) => {
    const d = new Date(r.date || r.createdAt);
    return (
      d.getFullYear() === selectedMonth.getFullYear() &&
      d.getMonth() === selectedMonth.getMonth()
    );
  });

  /* 월 총합 */
  const incomeSum = filtered
    .filter((r) => r.type === "income")
    .reduce((a, b) => a + b.amount, 0);
  const expenseSum = filtered
    .filter((r) => r.type === "expense")
    .reduce((a, b) => a + b.amount, 0);

  /* 날짜별 합 */
  const dailyTotals = {};
  filtered.forEach((r) => {
    const key = (r.date || r.createdAt).slice(0, 10);
    if (!dailyTotals[key]) dailyTotals[key] = { income: 0, expense: 0 };

    if (r.type === "income") dailyTotals[key].income += r.amount;
    else dailyTotals[key].expense += r.amount;
  });

  /* ───── 타일 표시 ───── */
  const tileContent = ({ date, view }) => {
    if (view !== "month") return null;

    const key = date.toISOString().slice(0, 10);
    const data = dailyTotals[key];

    return (
      <div style={{ width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: "14px" }}>{date.getDate()}</div>

        <AmountBox>
          {data?.income > 0 && (
            <div style={{ color: "#2ecc71" }}>
              +{formatNumber(data.income)}
            </div>
          )}
          {data?.expense > 0 && (
            <div style={{ color: "#e74c3c" }}>
              -{formatNumber(data.expense)}
            </div>
          )}
        </AmountBox>
      </div>
    );
  };

  /* ───── 타일 강조 ───── */
  const tileClassName = ({ date, view }) => {
    if (view !== "month") return "";

    if (
      selectedDate &&
      date.toISOString().slice(0, 10) === selectedDate.toISOString().slice(0, 10)
    ) {
      return "selected-tile";
    }
    return "";
  };

  /* 요일 */
  const formatShortWeekday = (_, date) =>
    ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];

  /* ───── 선택 날짜 상세 내역 ───── */
  const selectedKey = selectedDate
    ? selectedDate.toISOString().slice(0, 10)
    : null;

  const selectedList = selectedKey
    ? filtered.filter((r) => (r.date || r.createdAt).slice(0, 10) === selectedKey)
    : [];

  return (
    <PageWrap>
      <HeaderFix>
        <Header title="월간 수입·지출 캘린더" />
      </HeaderFix>

      <Content>
        {/* 월 요약 */}
        <SummaryBox>
          <Row>
            <span>총 수입</span>
            <span>{formatNumber(incomeSum)} {unit}</span>
          </Row>
          <Row>
            <span>총 지출</span>
            <span>{formatNumber(expenseSum)} {unit}</span>
          </Row>
          <Row style={{ fontWeight: "bold" }}>
            <span>잔액</span>
            <span>{formatNumber(incomeSum - expenseSum)} {unit}</span>
          </Row>
        </SummaryBox>

        {/* 달력 */}
        <Calendar
          locale="ko-KR"
          calendarType="gregory"
          formatShortWeekday={formatShortWeekday}
          onClickDay={(value) => setSelectedDate(value)}
          onActiveStartDateChange={(v) => setSelectedMonth(v.activeStartDate)}
          value={selectedMonth}
          tileContent={tileContent}
          tileClassName={tileClassName}
        />

        {/* 상세 내역 */}
        {selectedList.length > 0 && (
          <DetailBox>
            <h3 style={{ marginBottom: "10px" }}>
              {selectedKey} 상세 내역
            </h3>

            {selectedList.map((r) => (
              <div
                key={r.id}
                style={{
                  marginBottom: "8px",
                  borderBottom: `1px solid #ccc`,
                  paddingBottom: "6px",
                }}
              >
                <div>[{r.type === "income" ? "수입" : "지출"}] {r.title}</div>
                <div
                    style={{
                        fontWeight: "bold",
                        color: r.type === "income" ? "#2ecc71" : "#e74c3c"
                    }}
                    >
                    {r.type === "income" ? "+" : "-"}
                    {formatNumber(r.amount)} {unit}
                </div>

              </div>
            ))}
          </DetailBox>
        )}
      </Content>
    </PageWrap>
  );
}
