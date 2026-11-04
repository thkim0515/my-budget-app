import { isKakaoBankNotification } from "./kakaoParser";
import { completeMerchant, extractCardMerchant, findDuplicate, isHiddenNonExpense, matchSource, parseSpendNotification, parseWhen, sourceById } from "./spendParser";
import { bucketSeries, buildSpendPayload, inPeriod, monthPeriod, previousPeriod, rangePeriod, saveSpendResult, loadSpendResults, sourceBreakdown, totalSpend, txsOfSource } from "./spendStats";
import { excludedSummary, listHidden, mergeSpend, repairMerchants, restoreHidden } from "./spendStore";

const at = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
const samsung = sourceById("samsung");
const parse = (title, text, source = samsung, channel = "message") => parseSpendNotification({ title, text, package: "p", time: at(2026, 11, 2) }, source, channel);

describe("출처 판별", () => {
  const selected = ["samsung", "kakaobank"];
  test("Claude 같은 비금융 앱 알림은 본문에 금융사 이름이 있어도 무시", () => {
    const claude = { package: "com.anthropic.claude", title: "Claude", text: "카카오뱅크 탭 → 결제 12,000원 승인" };
    expect(matchSource(claude, selected)).toBeNull();
    expect(isKakaoBankNotification(claude)).toBe(false);
  });
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
  const all = mergeSpend(spend, kakao, ["kakaobank", "samsung", "kakaopay"]);
  const oct = monthPeriod("2026-10");

  test("입금 제외, 페이 겹침 제거, 취소 차감, 이체 제외", () => {
    expect(all.find((t) => t.id === "k2")).toBeUndefined();
    expect(all.find((t) => t.id === "s4")).toBeUndefined();
    expect(all.find((t) => t.id === "s3")).toBeUndefined();
    expect(totalSpend(inPeriod(all, oct))).toBe(25400);
    expect(sourceBreakdown(inPeriod(all, oct)).map((r) => [r.name, r.amount, r.count])).toEqual([
      ["삼성카드", 15000, 1],
      ["카카오뱅크", 10400, 2],
    ]);
    expect(mergeSpend(spend, kakao, ["samsung"]).some((t) => t.id === "k1")).toBe(false);
  });
  test("체크 해제한 금융사는 보기에서만 빠지고, 다시 체크하면 돌아옴", () => {
    const before = JSON.stringify([spend, kakao]);
    const off = mergeSpend(spend, kakao, ["kakaobank", "kakaopay"]);
    expect(off.some((t) => t.sourceId === "samsung")).toBe(false);
    expect(totalSpend(inPeriod(off, oct))).toBe(10400);
    expect(sourceBreakdown(inPeriod(off, oct), ["kakaobank", "kakaopay"]).map((r) => r.id)).toEqual(["kakaobank", "kakaopay"]);
    expect(JSON.stringify([spend, kakao])).toBe(before);
    expect(mergeSpend(spend, kakao, ["kakaobank", "samsung", "kakaopay"])).toEqual(all);
    // 카카오뱅크 해제: 알림 내역과 거래내역서 내역이 함께 빠지고, 겹쳐서 숨겨졌던 페이 결제는 한 번 보인다.
    const noKakao = mergeSpend(spend, kakao, ["samsung", "kakaopay"]);
    expect(noKakao.some((t) => t.sourceId === "kakaobank")).toBe(false);
    expect(noKakao.some((t) => t.id === "s4")).toBe(true);
    // 목록에 없는 출처는 다시 체크할 방법이 없으므로 빼지 않는다.
    const legacy = [{ id: "x", kind: "payment", amount: 1, ts: 1, merchant: "옛 내역" }, { id: "y", kind: "payment", amount: 1, ts: 1, merchant: "옛 내역", sourceId: "gone" }];
    expect(mergeSpend(legacy, [], [])).toHaveLength(2);
  });
  test("제외 안내 건수", () => {
    expect(excludedSummary(spend, kakao, ["kakaobank", "samsung", "kakaopay"])).toEqual({ sources: 0, count: 0 });
    // 삼성카드는 결제·취소·지난달 3건(이체 제외), 페이 겹침 건은 세지 않는다.
    expect(excludedSummary(spend, kakao, ["kakaobank"])).toEqual({ sources: 1, count: 3 });
    expect(excludedSummary(spend, kakao, [])).toEqual({ sources: 2, count: 5 });
    expect(excludedSummary([{ id: "x", kind: "payment", amount: 1, ts: 1, merchant: "옛 내역" }], [], [])).toEqual({ sources: 0, count: 0 });
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
  test("금융사별: 합계·건수·비중, 고른 곳은 0원 표시, 금융사 필터", () => {
    const list = inPeriod(all, oct);
    const rows = sourceBreakdown(list, ["samsung", "shinhan"]);
    expect(rows.map((r) => [r.id, r.name, r.amount, r.count])).toEqual([
      ["samsung", "삼성카드", 15000, 1],
      ["kakaobank", "카카오뱅크", 10400, 2],
      ["shinhan", "신한카드", 0, 0],
    ]);
    expect(rows[0].share + rows[1].share).toBeCloseTo(1);
    expect(rows[2].share).toBe(0);
    expect(sourceBreakdown([])).toEqual([]);
    expect(totalSpend(txsOfSource(list, "kakaobank"))).toBe(10400);
  });
  test("Claude 로 금융사별 비중·상위 카테고리를 보냄", () => {
    const sent = buildSpendPayload(all, oct, "summary").출처별;
    expect(sent[0]).toMatchObject({ 이름: "삼성카드", 금액: 15000, 건수: 1, 비중: 59 });
    expect(sent[0].상위카테고리).toHaveLength(1);
    expect(sent[0].상위카테고리[0]).toMatch(/15000$/);
  });
  test("결과는 기간별로 저장, 같은 기간은 교체", () => {
    localStorage.clear();
    saveSpendResult({ key: "a", analysis: { summary: "1" } });
    saveSpendResult({ key: "b", analysis: { summary: "2" } });
    saveSpendResult({ key: "a", analysis: { summary: "3" } });
    expect(loadSpendResults().map((r) => r.analysis.summary)).toEqual(["3", "2"]);
  });
});

describe("지출이 아닌 안내·충전·이자 거르기", () => {
  const junk = ["충전했어요. 머니를 자동 충전했어요.", "알림 김태헌 02/27", "내일은 이자 나가는 19일은 대출 이자 내는 날이에요. 계좌 부족해요. 계좌를 채워주세요.",
    "내일 비상금대출 이자 갚는 날이에요. 확인해주세요.", "이자를 냈어요🔔 비상금대출의 이자 냈어요."];
  test("캡처 문구는 모두 숨김 대상, 이자카야·일반 가맹점은 아님", () => {
    junk.forEach((m) => expect(isHiddenNonExpense({ merchant: m })).toBe(true));
    expect(isHiddenNonExpense({ merchant: "이자카야 모리" })).toBe(false);
    expect(isHiddenNonExpense({ merchant: "드림월드플러스" })).toBe(false);
    expect(isHiddenNonExpense({ merchant: junk[0], keepAsExpense: true })).toBe(false);
  });
  test("알림 파서도 지출로 만들지 않음", () => {
    expect(parse("", "머니를 자동 충전했어요. 50,000원 충전했어요.").result).toBe("ignored");
    expect(parse("", "삼성카드 내일 대출 이자 3,000원 나가는 날이에요").result).toBe("ignored");
    expect(parse("", "삼성카드 이자를 냈어요 비상금대출의 이자 3,000원 출금").result).toBe("ignored");
  });
  test("보기에서만 숨기고 되돌리면 다시 나타남", async () => {
    const spend = [{ id: 1, kind: "payment", merchant: junk[2], amount: 1000, ts: 1, sourceId: "samsung" }, { id: 2, kind: "payment", merchant: "스타벅스", amount: 1000, ts: 2, sourceId: "samsung" }];
    const kakao = [{ id: 3, kind: "payment", merchant: junk[4], amount: 3000, ts: 3 }];
    expect(mergeSpend(spend, kakao, ["samsung", "kakaobank"]).map((t) => t.id)).toEqual([2]);
    const hidden = listHidden(spend, kakao);
    expect(hidden).toHaveLength(2);
    const saved = {};
    await restoreHidden(hidden, async (store, t) => { saved[`${store}${t.id}`] = t; });
    expect(mergeSpend([saved.spendTx1, spend[1]], [saved.kakaoTx3], ["samsung", "kakaobank"])).toHaveLength(3);
  });
});

describe("카드 승인 문자 가맹점 이름", () => {
  test("캡처의 문구에서 가맹점만 뽑음", () => {
    expect(extractCardMerchant("김*헌 일시불 21:15 드림월드플러")).toBe("드림월드플러");
    expect(extractCardMerchant("김*헌 일시불 13:48 네일앤스타일")).toBe("네일앤스타일");
    expect(extractCardMerchant("김*헌 일시불 18:44 여기어때컴퍼")).toBe("여기어때컴퍼");
    expect(extractCardMerchant("김*헌 3개월 02/25 21:15 스타벅스 누적 120,000원")).toBe("스타벅스");
    expect(extractCardMerchant("스타벅스 강남점")).toBeNull();
  });
  test("승인 문자 알림도 가맹점만 저장", () => {
    const r = parse("", "삼성5215승인 김*헌 12,000원 일시불 02/25 21:15 드림월드플러스 누적 100,000원");
    expect(r.tx.merchant).toBe("드림월드플러스");
  });
  test("잘린 이름은 기존 같은 앞부분 이름으로 잇고 법인 표기는 무시", () => {
    expect(completeMerchant("드림월드플러", ["주 드림월드플러스", "주 드림월드플러스", "스타벅스"])).toBe("주 드림월드플러스");
    expect(completeMerchant("여기어때컴퍼", ["여기어때컴퍼니"])).toBe("여기어때컴퍼니");
    expect(completeMerchant("스타벅스", ["스타벅스 강남점"])).toBe("스타벅스"); // 3글자 이상 차이는 잇지 않음
    expect(completeMerchant("네일앤스타일", ["다른곳"])).toBe("네일앤스타일");
  });
  test("저장분 재정리: 원래 이름 보존·되돌리기, 직접 고친 건 제외", async () => {
    const data = [
      { id: 1, kind: "payment", merchant: "김*헌 일시불 21:15 드림월드플러", inputMode: "import" },
      { id: 2, kind: "payment", merchant: "주 드림월드플러스", inputMode: "import" },
      { id: 3, kind: "payment", merchant: "김*헌 일시불 13:48 네일앤스타일", inputMode: "manual" },
    ];
    const put = async (_s, t) => { data.splice(data.findIndex((x) => x.id === t.id), 1, t); };
    const r = await repairMerchants({ getAll: async () => data, put });
    expect(r.count).toBe(1);
    expect(data[0]).toMatchObject({ merchant: "주 드림월드플러스", merchantRaw: "김*헌 일시불 21:15 드림월드플러" });
    expect(data[2].merchant).toBe("김*헌 일시불 13:48 네일앤스타일");
    await r.undo();
    expect(data[0].merchant).toBe("김*헌 일시불 21:15 드림월드플러");
  });
});
