import { useEffect, useState, useRef } from "react";
import styled from "styled-components";
import Header from "../components/Header";
import { formatNumber } from "../utils/numberFormat";
import { useCurrencyUnit } from "../hooks/useCurrencyUnit";
import { useBudgetDB } from "../hooks/useBudgetDB";

const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.text};
`;

const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  z-index: 20;
`;

const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-top: 96px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
`;

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
  cursor: pointer;
`;

const Td = styled.td`
  padding: 12px 8px;
  text-align: center;
  border-bottom: 1px solid ${({ theme }) => theme.border};
`;

export default function StatsBySourcePage() {
  const [records, setRecords] = useState([]);
  const [, forceUpdate] = useState(0);

  const sortMode = useRef(0);
  // 0 = 원본, 1 = 내림차순, 2 = 오름차순

  const { unit } = useCurrencyUnit();
  const { db, getAll } = useBudgetDB();

  useEffect(() => {
    if (db) {
      load();
    }
  }, [db]);

  const load = async () => {
    const rec = await getAll("records");
    setRecords(rec);
  };

  const grouped = records
    .filter((r) => r.type === "expense")
    .reduce((acc, cur) => {
      const key = cur.source || "출처 없음";
      acc[key] = (acc[key] || 0) + cur.amount;
      return acc;
    }, {});

  let summary = Object.entries(grouped).map(([source, total]) => ({
    source,
    total,
  }));

  if (sortMode.current === 1) {
    summary.sort((a, b) => b.total - a.total);
  } else if (sortMode.current === 2) {
    summary.sort((a, b) => a.total - b.total);
  }

  const onSortClick = () => {
    sortMode.current = (sortMode.current + 1) % 3;
    forceUpdate((n) => n + 1);
  };

  const sortIcon = sortMode.current === 0 ? "⇅" : sortMode.current === 1 ? "▼" : "▲";

  return (
    <PageWrap>
      <HeaderFix>
        <Header title="출처별 지출" />
      </HeaderFix>

      <Content>
        <Table>
          <thead>
            <tr>
              <Th>출처</Th>
              <Th onClick={onSortClick}>총 지출 {sortIcon}</Th>
            </tr>
          </thead>

          <tbody>
            {summary.map((item, idx) => (
              <tr key={idx}>
                <Td>{item.source}</Td>
                <Td>
                  {formatNumber(item.total)} {unit}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Content>
    </PageWrap>
  );
}
