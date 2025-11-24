import { useEffect, useState } from 'react';
import { initDB } from '../db/indexedDB';
import styled from 'styled-components';
import Header from "../components/Header";
import { formatNumber } from '../utils/numberFormat';
import { formatCompact } from '../utils/numberFormat';
import { useCurrencyUnit } from '../hooks/useCurrencyUnit';

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from 'chart.js';

import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

// 레이아웃
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

// 스타일
const Table = styled.table`
  width: 100%;
  margin-top: 16px;
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

const ChartBox = styled.div`
  margin-top: 20px;
  background: ${({ theme }) => theme.card};
  padding: 20px;
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.border};
`;

export default function StatsPage() {
  const [chapters, setChapters] = useState([]);
  const [records, setRecords] = useState([]);
  const { unit } = useCurrencyUnit();

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const db = await initDB();
    const chapterList = await db.getAll('chapters');
    const recordList = await db.getAll('records');

    setChapters(chapterList);
    setRecords(recordList);
  };

  const getSummaryByChapter = () => {
    return chapters.map(ch => {
      const filtered = records.filter(r => r.chapterId === ch.chapterId);

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

  const chartData = {
    labels: summaryList.map(s => s.title),
    datasets: [
      {
        label: '잔액',
        data: summaryList.map(s => s.balance),
        backgroundColor: 'rgba(25, 118, 210, 0.6)',
        borderColor: 'rgba(25, 118, 210, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { labels: { color: '#aaa' } } },
    scales: {
      x: {
        ticks: { color: '#aaa' },
        grid: { color: '#444' },
      },
      y: {
        ticks: { color: '#aaa' },
        grid: { color: '#444' },
      },
    },
  };

  return (
    <PageWrap>

      {/* 고정 헤더 */}
      <HeaderFix>
        <Header title="통계" />
      </HeaderFix>

      {/* 콘텐츠 영역 */}
      <Content>

        <ChartBox>
          <h3 style={{ marginBottom: 20 }}>잔액 차트</h3>
          <Bar data={chartData} options={chartOptions} />
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
                <Td>{formatCompact(s.income)} {unit}</Td>
                <Td>{formatCompact(s.expense)} {unit}</Td>
                <Td>{formatCompact(s.balance)} {unit}</Td>
                {/* <Td>{formatNumber(s.income)} {unit}</Td>
                <Td>{formatNumber(s.expense)} {unit}</Td>
                <Td>{formatNumber(s.balance)} {unit}</Td> */}
              </tr>
            ))}
          </tbody>
        </Table>

      </Content>
    </PageWrap>
  );
}
