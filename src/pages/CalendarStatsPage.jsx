import { useState, useEffect } from "react";
import styled from "styled-components";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import Header from "../components/Header";
import { useBudgetDB } from "../hooks/useBudgetDB";
import { formatNumber } from "../utils/numberFormat";
import { useCurrencyUnit } from "../hooks/useCurrencyUnit";
import { useNavigate } from "react-router-dom";
import { formatCompact } from "../utils/numberFormat";
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

  /* 타일칸 기본화 */
  .react-calendar__tile {
    background: transparent !important;
    border-radius: 6px;
    min-height: 75px;
    padding: 4px;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    transition: background 0.2s ease;
    overflow: hidden;
  }

  .react-calendar__tile--now {
    background: transparent !important;
  }

  /* 선택된 날짜 강조 */
  .selected-tile {
    background: ${({ theme }) => theme.activeBg} !important;
    border: 1px solid ${({ theme }) => theme.activeText};
    animation: fadeIn 0.2s ease;
    color: ${({ theme }) => theme.activeText} !important;
    font-weight: bold;
  }

  .react-calendar__tile--now abbr {
    color: ${({ theme }) => theme.text} !important;
    font-weight: bold;
  } 


  .selected-tile abbr {
    color: ${({ theme }) => theme.activeText} !important;
    font-weight: bold;
    // text-shadow: 0 0 3px rgba(0,0,0,0.4);
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

  /* 이웃 달 흐림 제거 */
  .react-calendar__month-view__days__day--neighboringMonth {
    opacity: 1 !important;
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
`;

const Card = styled.div`
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 12px;
  box-shadow: 0 2px 5px rgba(0,0,0,0.05);
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

/* 날짜 Key 통일 함수 */
const formatDateKey = (d) =>
  d
    .toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    .replace(/\. /g, "-")
    .replace(".", "");

export default function CalendarStatsPage() {
  const { db, getAll } = useBudgetDB();
  const { unit } = useCurrencyUnit();

  const [records, setRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const navigate = useNavigate();

  useEffect(() => {
    if (db) load();
  }, [db]);

  const load = async () => {
    const rec = await getAll("records");
    setRecords(rec);
  };

  /* 월 필터 */
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

  /* 날짜별 집계 */
  const dailyTotals = {};
  filtered.forEach((r) => {
    const key = formatDateKey(new Date(r.date || r.createdAt));
    if (!dailyTotals[key]) dailyTotals[key] = { income: 0, expense: 0 };

    if (r.type === "income") dailyTotals[key].income += r.amount;
    else dailyTotals[key].expense += r.amount;
  });

  /* 타일 UI */
  const tileContent = ({ date, view }) => {
    if (view !== "month") return null;

    const key = formatDateKey(date);
    const data = dailyTotals[key];

    return (
        <AmountBox>
        {data?.income > 0 && (
            <div style={{ color: "#2ecc71" }}>
            +{formatCompact(data.income)}
            </div>
        )}

        {data?.expense > 0 && (
            <div style={{ color: "#e74c3c" }}>
            -{formatCompact(data.expense)}
            </div>
        )}
        </AmountBox>
    );
    };

  const tileClassName = ({ date, view }) => {
    if (view !== "month") return "";

    if (
      selectedDate &&
      formatDateKey(date) === formatDateKey(selectedDate)
    ) {
      return "selected-tile";
    }
    return "";
  };

  const formatShortWeekday = (_, date) =>
    ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];

  /* 선택 날짜 */
  const selectedKey = selectedDate ? formatDateKey(selectedDate) : null;

  const selectedList = selectedKey
    ? filtered.filter(
        (r) => formatDateKey(new Date(r.date || r.createdAt)) === selectedKey
      )
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
            <h3 style={{ marginBottom: "14px" }}>
              {selectedKey} 상세 내역
            </h3>

            {selectedList.map((r) => (
              <Card 
                key={r.id}
                // onClick={() => navigate(`/detail/${r.id}`)}
                onClick={() => navigate(`/detail/${formatDateKey(new Date(r.date || r.createdAt))}/${r.id}`)}

                style={{ cursor: "pointer" }}
                >
                    <Title>
                        [{r.type === "income" ? "수입" : "지출"}] {r.title}
                    </Title>

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
