import { useState, useEffect, useCallback } from "react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import Header from "../../components/UI/Header";
import { useBudgetDB } from "../../hooks/useBudgetDB";
import { formatNumber, formatCompact } from "../../utils/numberFormat";
import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import { useNavigate } from "react-router-dom";
import { useSwipeable } from "react-swipeable";
import Holidays from "date-holidays";

import * as S from "./CalendarStatsPage.styles";

/* 공휴일 초기화 */
const hd = new Holidays("KR");

/* 날짜 KEY */
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
  const navigate = useNavigate();

  const [records, setRecords] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [slide, setSlide] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);

  // DB에서 records 로드 (Hooks 규칙 대응)
  const load = useCallback(async () => {
    const rec = await getAll("records");
    setRecords(rec);
  }, [getAll]);

  // DB 준비 시 데이터 로드
  useEffect(() => {
    if (db) {
      load();
    }
  }, [db, load]);

  /* 월 데이터 필터 */
  const filtered = records.filter((r) => {
    const d = new Date(r.date || r.createdAt);
    return (
      d.getFullYear() === selectedMonth.getFullYear() &&
      d.getMonth() === selectedMonth.getMonth()
    );
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
      <S.AmountBox>
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
      </S.AmountBox>
    );
  };

  /* 날짜 스타일 */
  const tileClassName = ({ date, view }) => {
    if (view !== "month") return "";

    const classes = [];

    if (date.getMonth() !== selectedMonth.getMonth()) {
      classes.push("not-current-month");
    }

    if (hd.isHoliday(date)) {
      classes.push("day-holiday");
    } else if (date.getDay() === 0) {
      classes.push("day-sun");
    } else if (date.getDay() === 6) {
      classes.push("day-sat");
    } else {
      classes.push("day-weekday");
    }

    if (formatDateKey(date) === formatDateKey(selectedDate)) {
      classes.push("selected-tile");
    }

    return classes.join(" ");
  };

  /* 요일 표시 */
  const formatShortWeekday = (_, date) =>
    ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];

  /* 선택된 날짜 상세 */
  const selectedKey = selectedDate ? formatDateKey(selectedDate) : null;
  const selectedList = selectedKey
    ? filtered.filter(
        (r) =>
          formatDateKey(new Date(r.date || r.createdAt)) === selectedKey
      )
    : [];

  /* 스와이프 */
  const handlers = useSwipeable({
    onSwipedLeft: () => {
      if (isAnimating) return;

      setIsAnimating(true);
      setSlide("slide-left");

      setTimeout(() => {
        const next = new Date(selectedMonth);
        next.setMonth(selectedMonth.getMonth() + 1);
        setSelectedMonth(next);

        setSlide("");
        setIsAnimating(false);
      }, 150);
    },

    onSwipedRight: () => {
      if (isAnimating) return;

      setIsAnimating(true);
      setSlide("slide-right");

      setTimeout(() => {
        const prev = new Date(selectedMonth);
        prev.setMonth(selectedMonth.getMonth() - 1);
        setSelectedMonth(prev);

        setSlide("");
        setIsAnimating(false);
      }, 150);
    },

    trackMouse: true,
  });

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header title="월간 수입·지출 캘린더" />
      </S.HeaderFix>

      <S.Content>
        <S.SummaryBox>
          <S.Row>
            <span>총 수입</span>
            <span>
              {formatNumber(
                filtered
                  .filter((r) => r.type === "income")
                  .reduce((a, b) => a + b.amount, 0)
              )}{" "}
              {unit}
            </span>
          </S.Row>

          <S.Row>
            <span>총 지출</span>
            <span>
              {formatNumber(
                filtered
                  .filter((r) => r.type === "expense")
                  .reduce((a, b) => a + b.amount, 0)
              )}{" "}
              {unit}
            </span>
          </S.Row>
        </S.SummaryBox>

        <div {...handlers} className={`calendar-slide ${slide}`}>
          <Calendar
            key={selectedMonth.toISOString()}
            locale="ko-KR"
            calendarType="gregory"
            formatShortWeekday={formatShortWeekday}
            onClickDay={(value) => setSelectedDate(value)}
            onActiveStartDateChange={(v) =>
              setSelectedMonth(v.activeStartDate)
            }
            value={selectedMonth}
            tileContent={tileContent}
            tileClassName={tileClassName}
          />
        </div>

        {selectedList.length > 0 && (
          <S.DetailBox>
            <h3>{selectedKey} 상세 내역</h3>

            {selectedList.map((r) => (
              <S.Card
                key={r.id}
                onClick={() =>
                  navigate(
                    `/detail/date/${selectedKey}/${r.id}/${r.chapterId}`
                  )
                }
                style={{ cursor: "pointer" }}
                $isPaid={r.isPaid}
              >
                <S.Title $isPaid={r.isPaid}>
                  [{r.type === "income" ? "수입" : "지출"}] {r.title}
                </S.Title>

                <S.Amount type={r.type} $isPaid={r.isPaid}>
                  {r.type === "income" ? "+" : "-"}
                  {formatNumber(r.amount)} {unit}
                </S.Amount>
              </S.Card>
            ))}
          </S.DetailBox>
        )}
      </S.Content>
    </S.PageWrap>
  );
}
