import { findDuplicate, matchSource, parseSpendNotification, parseWhen, sourceById } from "./spendParser";
import { bucketSeries, buildSpendPayload, bySource, inPeriod, monthPeriod, previousPeriod, rangePeriod, saveSpendResult, loadSpendResults, totalSpend } from "./spendStats";
import { mergeSpend } from "./spendStore";

const at = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
const samsung = sourceById("samsung");
const parse = (title, text, source = samsung, channel = "message") => parseSpendNotification({ title, text, package: "p", time: at(2026, 11, 2) }, source, channel);

describe("출처 판별", () => {
  const selected = ["samsung", "kakaobank"];
  test("체크한 앱·문자는 인식, 체크 안 한 앱은 무시", () => {
    expect(matchSource({ package: "kr.co.samsungcard.mpocket", title: "x", text: "y" }, selected).channel).toBe("own");
    expect(matchSource({ package: "com.samsung.android.messaging", title: "15888900", text: "삼성5215승인 김*헌 1,000원" }, selected).source.id).toBe("samsung");
    expect(matchSource({ package: "com.hyundaicard.appcard", title: "x", text: "삼성카드 1,000원 승인" }, selected)).toBeNull();
    expect(matchSource({ package: "com.samsung.android.messaging", title: "1", text: "신한카드 승인 1,000원" }, selected)).toBeNull();
  });
  test("카카오톡은 보낸 곳이 금융사일 때만", () => {
    expect(matchSource({ package: "com.kakao.talk", title: "삼성카드", text: "승인 1,000원" }, selected).source.id).toBe("samsung");
    expect(matchSource({ package: "com.kakao.talk", title: "친구", text: "삼성카드로 승인 1,000원 됐어" }, selected)).toBeNull();
  });
});

describe("지출 해석", () => {
  test("실제 삼성카드 승인 문자", () => {
    const { tx } = parse("15888900", "삼성5215승인 김*헌 29,000원 일시불 09/11 23:50 무바 누적1,236,294원");
    expect(tx).toMatchObject({ kind: "payment", amount: 29000, merchant: "무바", installment: 0, ts: at(2026, 9, 11, 23, 50) });
  });
  test("할부와 가맹점", () => {
    const { tx } = parse("신한카드", "신한카드(1234)승인 홍*동 120,000원(3개월)10/31 12:30 쿠팡 누적500,000원", sourceById("shinhan"));
    expect(tx).toMatchObject({ amount: 120000, installment: 3, merchant: "쿠팡" });
  });
  test("이체·대출은 지출이 아니라 버림", () => {
    expect(parse("", "삼성카드 이체 승인 30,000원").result).toBe("ignored");
    expect(parse("", "카드론 대출 승인 500,000원").result).toBe("ignored");
  });
  test("취소·입금·청구·실패·광고", () => {
    expect(parse("", "삼성5215 승인취소 김*헌 8,000원 10/30 11:00 쿠팡").tx.kind).toBe("refund");
    expect(parse("", "삼성카드 입금 5,000원").result).toBe("ignored");
    expect(parse("", "삼성카드 11월 결제예정금액 300,000원 안내").result).toBe("ignored");
    expect(parse("", "삼성5215 승인거절 5,000원 한도초과").result).toBe("ignored");
    expect(parse("", "삼성카드 이벤트 결제 시 5,000원 할인").result).toBe("ignored");
  });
  test("읽지 못하면 미분류, 외화 포함. 다른 앱 경로는 버림", () => {
    expect(parse("", "삼성5215 승인 12.50달러 AMAZON").result).toBe("unclassified");
    expect(parse("", "삼성카드 승인 내역이 있습니다").result).toBe("unclassified");
    expect(parse("", "삼성카드 승인 내역이 있습니다", samsung, "other").result).toBe("ignored");
  });
  test("연도 넘김: 미래 날짜는 작년", () => {
    expect(parseWhen("12/31 23:00", at(2027, 1, 1, 1)).ts).toBe(at(2026, 12, 31, 23));
    expect(parseWhen("내용", 123).ts).toBe(123);
  });
});

describe("중복", () => {
  const base = { kind: "payment", amount: 1000, ts: at(2026, 11, 1), sourceId: "samsung", pkg: "a" };
  test("같은 출처 앱+문자, 페이+카드는 중복. 카드끼리는 별개", () => {
    expect(findDuplicate({ ...base, pkg: "b", ts: base.ts + 60000 }, [base])).toBeTruthy();
    expect(findDuplicate({ ...base, ts: base.ts + 60000 }, [base])).toBeFalsy();
    expect(findDuplicate({ ...base, sourceId: "naverpay", ts: base.ts + 60000 }, [base])).toBeTruthy();
    expect(findDuplicate({ ...base, sourceId: "shinhan", ts: base.ts + 60000 }, [base])).toBeFalsy();
  });
});

describe("통합·기간 집계", () => {
  const kakao = [
    { id: "k1", kind: "payment", amount: 10000, ts: at(2026, 10, 5, 9), merchant: "스타벅스", category: "식비" },
    { id: "k2", kind: "income", amount: 999999, ts: at(2026, 10, 6), merchant: "급여" },
  ];
  const spend = [
    { id: "s1", kind: "payment", amount: 20000, ts: at(2026, 10, 7, 20), merchant: "쿠팡", category: "쇼핑", sourceId: "samsung" },
    { id: "s2", kind: "refund", amount: 5000, ts: at(2026, 10, 8), merchant: "쿠팡", category: "쇼핑", sourceId: "samsung" },
    { id: "s3", kind: "transfer", amount: 70000, ts: at(2026, 10, 9), merchant: "상대이름", category: "이체", sourceId: "samsung" },
    { id: "s6", kind: "payment", amount: 400, ts: at(2026, 10, 9), merchant: "내역서", category: "기타", sourceId: "kakaobank", pkg: "statement" },
    { id: "s4", kind: "payment", amount: 10000, ts: at(2026, 10, 5, 9, 1), merchant: "스타벅스", category: "식비", sourceId: "kakaopay" },
    { id: "s5", kind: "payment", amount: 3000, ts: at(2026, 9, 7), merchant: "GS25", category: "편의점", sourceId: "samsung" },
  ];
  const all = mergeSpend(spend, kakao);
  const oct = monthPeriod("2026-10");

  test("입금 제외, 페이 겹침 제거, 취소 차감, 이체 제외", () => {
    expect(all.find((t) => t.id === "k2")).toBeUndefined();
    expect(all.find((t) => t.id === "s4")).toBeUndefined();
    expect(all.find((t) => t.id === "s3")).toBeUndefined();
    expect(totalSpend(inPeriod(all, oct))).toBe(25400);
    expect(bySource(inPeriod(all, oct))).toEqual([
      { name: "삼성카드", amount: 15000, count: 1 },
      { name: "카카오뱅크", amount: 10400, count: 2 },
    ]);
    expect(mergeSpend(spend, kakao, ["samsung"]).some((t) => t.id === "k1")).toBe(false);
  });
  test("기간과 직전 기간", () => {
    const r = rangePeriod("2026-10-05", "2026-10-07");
    expect(totalSpend(inPeriod(all, r))).toBe(30000);
    expect(previousPeriod(r)).toMatchObject({ start: "2026-10-02", end: "2026-10-04" });
    expect(previousPeriod(oct).key).toBe("2026-09");
    expect(rangePeriod("2026-10-07", "2026-10-05").key).toBe("2026-10-05~2026-10-07");
  });
  test("구간", () => {
    expect(bucketSeries(all, oct, "day")).toHaveLength(31);
    expect(bucketSeries(all, oct, "day")[6].spend).toBe(20000);
    const months = bucketSeries(all, oct, "month");
    expect(months).toHaveLength(12);
    expect(months[11].spend).toBe(25400);
    expect(months[10].spend).toBe(3000);
    expect(bucketSeries(all, oct, "week").reduce((a, b) => a + b.spend, 0)).toBe(25400);
  });
  test("요약은 집계만, 상세는 지출 목록 추가. 어느 쪽도 입금·이체 없음", () => {
    const summary = JSON.stringify(buildSpendPayload(all, oct, "summary"));
    expect(summary).toContain("시간대별");
    expect(summary).not.toContain("지출목록");
    const detail = buildSpendPayload(all, oct, "detail");
    expect(detail.지출목록[0]).toEqual({ 일시: "2026-10-05 09:00", 가맹점: "스타벅스", 금액: 10000, 카테고리: "식비", 출처: "카카오뱅크" });
    expect(detail.지출목록.find((t) => t.금액 === -5000)).toBeTruthy();
    const text = JSON.stringify(detail);
    ["상대이름", "급여", "999999", "70000"].forEach((v) => expect(text).not.toContain(v));
  });
  test("결과는 기간별로 저장, 같은 기간은 교체", () => {
    localStorage.clear();
    saveSpendResult({ key: "a", analysis: { summary: "1" } });
    saveSpendResult({ key: "b", analysis: { summary: "2" } });
    saveSpendResult({ key: "a", analysis: { summary: "3" } });
    expect(loadSpendResults().map((r) => r.analysis.summary)).toEqual(["3", "2"]);
  });
});
