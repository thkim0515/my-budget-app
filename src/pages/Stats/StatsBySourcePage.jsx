import { useEffect, useState, useRef, useCallback } from "react";
import Header from "../../components/Header";
import { formatNumber } from "../../utils/numberFormat";
import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import { useBudgetDB } from "../../hooks/useBudgetDB";

import * as S from "./StatsBySourcePage.styles";

export default function StatsBySourcePage() {
  const [records, setRecords] = useState([]); // 기록 데이터
  const [, forceUpdate] = useState(0); // 정렬을 위한 강제 리렌더링

  const sortMode = useRef(0); // 0=기본, 1=내림차순, 2=오름차순

  const { unit } = useCurrencyUnit();
  const { db, getAll } = useBudgetDB();

  // DB에서 records 전체 로드 (Hooks 규칙 대응)
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

  // 출처별 지출 합산
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

  // 정렬 처리
  if (sortMode.current === 1) {
    summary.sort((a, b) => b.total - a.total);
  } else if (sortMode.current === 2) {
    summary.sort((a, b) => a.total - b.total);
  }

  // 정렬 버튼 클릭
  const onSortClick = () => {
    sortMode.current = (sortMode.current + 1) % 3;
    forceUpdate((n) => n + 1);
  };

  const sortIcon =
    sortMode.current === 0 ? "⇅" : sortMode.current === 1 ? "▼" : "▲";

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header title="출처별 지출" />
      </S.HeaderFix>

      <S.Content>
        <S.Table>
          <thead>
            <tr>
              <S.Th>출처</S.Th>
              <S.Th onClick={onSortClick}>총 지출 {sortIcon}</S.Th>
            </tr>
          </thead>

          <tbody>
            {summary.map((item, idx) => (
              <tr key={idx}>
                <S.Td>{item.source}</S.Td>
                <S.Td>
                  {formatNumber(item.total)} {unit}
                </S.Td>
              </tr>
            ))}
          </tbody>
        </S.Table>
      </S.Content>
    </S.PageWrap>
  );
}
