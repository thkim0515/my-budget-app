import { useEffect, useState, useRef } from "react";
import Header from "../../components/Header";
import { formatNumber } from "../../utils/numberFormat";
import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import { useBudgetDB } from "../../hooks/useBudgetDB";

import * as S from './StatsBySourcePage.styles'

export default function StatsBySourcePage() {
  const [records, setRecords] = useState([]); // 기록 데이터 저장
  const [, forceUpdate] = useState(0); // 강제 리렌더링

  const sortMode = useRef(0); // 정렬 모드 상태(0=기본,1=내림,2=오름)

  const { unit } = useCurrencyUnit(); // 통화 단위
  const { db, getAll } = useBudgetDB(); // DB 핸들링 훅

  useEffect(() => {
    if (db) {
      load(); // DB 준비 시 데이터 로드
    }
  }, [db]);

  const load = async () => {
    const rec = await getAll("records"); // DB에서 records 전체 조회
    setRecords(rec); // 상태 저장
  };

  const grouped = records
    .filter((r) => r.type === "expense") // 지출만 필터링
    .reduce((acc, cur) => {
      const key = cur.source || "출처 없음"; // 출처 없을 경우 기본값 지정
      acc[key] = (acc[key] || 0) + cur.amount; // 출처별 금액 합산
      return acc;
    }, {});

  let summary = Object.entries(grouped).map(([source, total]) => ({
    source, // 출처명
    total, // 총 지출액
  }));

  if (sortMode.current === 1) {
    summary.sort((a, b) => b.total - a.total); // 총 지출 내림차순
  } else if (sortMode.current === 2) {
    summary.sort((a, b) => a.total - b.total); // 총 지출 오름차순
  }

  const onSortClick = () => {
    sortMode.current = (sortMode.current + 1) % 3; // 정렬모드 순환 변경
    forceUpdate((n) => n + 1); // UI 강제 갱신
  };

  const sortIcon = sortMode.current === 0 ? "⇅" : sortMode.current === 1 ? "▼" : "▲"; // 정렬 표시 아이콘

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header title="출처별 지출" /> {/* 페이지 헤더 */}
      </S.HeaderFix>

      <S.Content>
        <S.Table>
          <thead>
            <tr>
              <S.Th>출처</S.Th> {/* 출처 헤더 */}
              <S.Th onClick={onSortClick}>총 지출 {sortIcon}</S.Th> {/* 정렬 버튼 */}
            </tr>
          </thead>

          <tbody>
            {summary.map((item, idx) => (
              <tr key={idx}>
                <S.Td>{item.source}</S.Td> {/* 출처명 */}
                <S.Td>
                  {formatNumber(item.total)} {unit} {/* 포맷된 지출 금액 */}
                </S.Td>
              </tr>
            ))}
          </tbody>
        </S.Table>
      </S.Content>
    </S.PageWrap>
  );
}
