import { useEffect, useState } from 'react';
import { initDB } from '../db/indexedDB';
import styled from 'styled-components';
import Header from "../components/Header";
import { formatCompact } from '../utils/numberFormat';
import { useCurrencyUnit } from '../hooks/useCurrencyUnit';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';

import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

// ────────────────────────────── 스타일 ──────────────────────────────
const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  color: ${({ theme }) => theme.text};
`;

const HeaderFix = styled.div`
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
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-top: 96px;
  padding-bottom: 100px;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
`;

const ChartBox = styled.div`
  margin-top: 20px;
  background: ${({ theme }) => theme.card};
  padding: 20px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.border};
`;

const Table = styled.table`
  width: 100%;
  margin-top: 20px;
  border-collapse: collapse;
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  border-radius: 8px;
  overflow: hidden;
`;

const Th = styled.th`
  padding: 12px 8px;
  background: ${({ theme }) => theme.headerBg};
  color: ${({ theme }) => theme.headerText};
  text-align: center;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

const Td = styled.td`
  padding: 12px 8px;
  text-align: center;
  border-bottom: 1px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.text};
  &:last-child {
    font-weight: bold;
  }
`;

// 월 선택 UI
const MonthSelector = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: bold;
`;

const ArrowBtn = styled.button`
  background: transparent;
  border: none;
  font-size: 22px;
  color: ${({ theme }) => theme.text};
  cursor: pointer;
`;

// ────────────────────────────── PAGE ──────────────────────────────

export default function StatsPage() {
  const [chapters, setChapters] = useState([]);
  const [records, setRecords] = useState([]);

  const { unit } = useCurrencyUnit();

  // 현재 기준 월 (기본값: 오늘)
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const db = await initDB();
    setChapters(await db.getAll("chapters"));
    setRecords(await db.getAll("records"));
  };

  // ───── 월 이동 함수 ─────
  const moveMonth = (delta) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + delta);
    setCurrentDate(newDate);
  };

  // ───── 해당 월 데이터 필터링 ─────
  const filteredRecords = records.filter(r => {
    const rDate = new Date(r.date || r.createdAt);

    return (
      rDate.getFullYear() === currentDate.getFullYear() &&
      rDate.getMonth() === currentDate.getMonth()
    );
  });

  // ───── 챕터별 집계 ─────
  const getSummaryByChapter = () => {
    return chapters.map(ch => {
      const filtered = filteredRecords.filter(r => r.chapterId === ch.chapterId);

      const income = filtered
        .filter(r => r.type === 'income')
        .reduce((a, b) => a + b.amount, 0);

      const expense = filtered
        .filter(r => r.type === 'expense')
        .reduce((a, b) => a + b.amount, 0);

      return {
        title: ch.title,
        income,
        expense,
        balance: income - expense
      };
    });
  };

  const summaryList = getSummaryByChapter();

  // ───── Bar Chart 데이터 (월별) ─────
  const barData = {
    labels: summaryList.map(s => s.title),
    datasets: [
      {
        label: "잔액",
        data: summaryList.map(s => s.balance),
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

  // ───── Pie Chart (월별) ─────
  const getCategoryData = () => {
    const expenseList = filteredRecords.filter(r => r.type === "expense");

    const categorySum = {};

    expenseList.forEach(r => {
      const key = r.category || "기타";
      categorySum[key] = (categorySum[key] || 0) + r.amount;
    });

    return {
      labels: Object.keys(categorySum),
      datasets: [
        {
          label: "지출 합계",
          data: Object.values(categorySum),
          backgroundColor: [
            "#FF6384",
            "#36A2EB",
            "#FFCE56",
            "#4BC0C0",
            "#9966FF",
            "#FF9F40",
          ],
        }
      ]
    };
  };

  // ────────────────────────────────────────────────────

  return (
    <PageWrap>

      <HeaderFix>
        <Header title="통계" />
      </HeaderFix>

      <Content>

        {/* 월 선택 UI */}
        <MonthSelector>
          <ArrowBtn onClick={() => moveMonth(-1)}>◀</ArrowBtn>

          <span>
            {currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월
          </span>

          <ArrowBtn onClick={() => moveMonth(1)}>▶</ArrowBtn>
        </MonthSelector>

        {/* Bar Chart */}
        <ChartBox>
          <h3>대제목별 잔액 (Bar)</h3>
          <Bar data={barData} options={barOptions} />
        </ChartBox>

        {/* Pie Chart */}
        <ChartBox>
          <h3>카테고리별 지출 (Pie)</h3>
          <div style={{ height: "260px", display: "flex", justifyContent: "center" }}>
            <Pie
              data={getCategoryData()}
              options={{ responsive: true, maintainAspectRatio: false }}
            />
          </div>
        </ChartBox>

        {/* 테이블 */}
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
                <Td>{formatCompact(s.income)} {unit}</Td>
                <Td>{formatCompact(s.expense)} {unit}</Td>
                <Td>{formatCompact(s.balance)} {unit}</Td>
              </tr>
            ))}
          </tbody>
        </Table>

      </Content>
    </PageWrap>
  );
}
