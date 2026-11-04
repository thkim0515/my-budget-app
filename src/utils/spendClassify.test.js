import { buildClassifyPayload, buildKnown, maskNotification, matchLocal, normalizeMerchant, parseRawWithClaude, setRawConsent, tidyLocal, tidyWithClaude, undoAutoCategory, acceptSuggestion, applyCategoryToSame, sameMerchantMessage, groupByMerchant, acceptSuggestionEverywhere } from "./spendClassify";
import { parseStatementRows, planImport, parseDateCell } from "./statementImport";
import { loadMerchantRules } from "./kakaoIngest";
import { BudgetPlugin } from "../plugins/BudgetPlugin";

jest.mock("../plugins/BudgetPlugin", () => ({ BudgetPlugin: { claudeMessages: jest.fn() } }));

const at = (y, m, d, h = 12, mi = 0) => new Date(y, m - 1, d, h, mi).getTime();
const store = (spend, kakao = []) => {
  const data = { spendTx: spend, kakaoTx: kakao };
  return {
    data,
    getAll: async (name) => data[name],
    put: async (name, item) => { data[name] = data[name].map((t) => (t.id === item.id ? item : t)); },
  };
};
const reply = (json) => ({ status: 200, body: JSON.stringify({ model: "claude-sonnet-5-5", stop_reason: "end_turn", usage: { input_tokens: 100, output_tokens: 50 }, content: [{ type: "text", text: JSON.stringify(json) }] }) });

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

describe("1단계: 앱 안 비교", () => {
  test("이름 정규화", () => {
    expect(normalizeMerchant("(주) 스타벅스 강남점")).toBe("스타벅스");
    expect(normalizeMerchant("GS25 역삼점")).toBe("gs25");
  });
  test("같은 이름·포함 관계로 맞추고, 사용자 규칙이 우선", () => {
    const known = buildKnown([{ kind: "payment", merchant: "스타벅스 역삼점", category: "식비" }], { 스타벅스: "구독" });
    expect(matchLocal("스타벅스 강남점", known)).toBe("구독");
    expect(matchLocal("메가커피", known)).toBeNull();
    const k2 = buildKnown([{ kind: "payment", merchant: "올리브영", category: "쇼핑" }], {});
    expect(matchLocal("CJ올리브영", k2)).toBe("쇼핑");
    expect(matchLocal("올", k2)).toBeNull();
  });
  test("미분류만 바꾸고 표시를 남김, 잠긴 항목은 건드리지 않음", async () => {
    const s = store([
      { id: "a", kind: "payment", merchant: "쿠팡", category: "쇼핑", ts: 1, amount: 1 },
      { id: "b", kind: "payment", merchant: "쿠팡 로켓", category: "기타", ts: 1, amount: 1 },
      { id: "c", kind: "payment", merchant: "쿠팡", category: "기타", categoryLocked: true, ts: 1, amount: 1 },
    ]);
    expect(await tidyLocal(s)).toBe(1);
    expect(s.data.spendTx[1]).toMatchObject({ category: "쇼핑", autoCategory: { by: "rule", from: "기타" } });
    expect(s.data.spendTx[2].category).toBe("기타");
  });
});

describe("2단계: Claude 분류(가짜 응답)", () => {
  const rows = () => [
    { id: "a", kind: "payment", merchant: "무바", category: "기타", ts: at(2026, 10, 1, 20), amount: 29000 },
    { id: "b", kind: "payment", merchant: "무바", category: "기타", ts: at(2026, 10, 2, 20), amount: 9000 },
    { id: "c", kind: "payment", merchant: "알수없음상점", category: "기타", ts: at(2026, 10, 2, 9), amount: 120000 },
  ];
  test("가맹점·금액대·시간대만 보냄", () => {
    const { payload } = buildClassifyPayload(rows().map((t) => ({ t })));
    expect(payload.가맹점).toEqual([
      { id: 0, 가맹점: "무바", 금액대: "1~3만원", 시간대: "저녁", 건수: 2 },
      { id: 1, 가맹점: "알수없음상점", 금액대: "10만원 이상", 시간대: "오전", 건수: 1 },
    ]);
  });
  test("높으면 적용, 낮으면 추천. 목록 밖 카테고리는 버림. 되돌리기·추천 수락", async () => {
    BudgetPlugin.claudeMessages.mockResolvedValue(reply({ items: [{ id: 0, category: "식비", confidence: 0.9 }, { id: 1, category: "쇼핑", confidence: 0.5 }] }));
    const s = store(rows());
    const r = await tidyWithClaude(s);
    expect(r).toMatchObject({ applied: 2, suggested: 1, tokens: { input: 100, output: 50 } });
    expect(s.data.spendTx[0]).toMatchObject({ category: "식비", autoCategory: { by: "claude", confidence: 0.9 } });
    expect(s.data.spendTx[2]).toMatchObject({ category: "기타", suggestedCategory: "쇼핑" });

    await undoAutoCategory({ ...s.data.spendTx[0], store: "spendTx" }, s);
    expect(s.data.spendTx[0]).toMatchObject({ category: "기타", categoryLocked: true });
    expect(s.data.spendTx[0].autoCategory).toBeUndefined();

    await acceptSuggestion({ ...s.data.spendTx[2], store: "spendTx" }, "쇼핑", s);
    expect(s.data.spendTx[2]).toMatchObject({ category: "쇼핑", categoryLocked: true });
    expect(loadMerchantRules().알수없음상점).toBe("쇼핑");
  });
  test("사용자가 정한 가맹점은 Claude 호출 없이 규칙으로 적용", async () => {
    localStorage.setItem("kakaoMerchantCategory", JSON.stringify({ 영재: "교육" }));
    const s = store([{ id: "a", kind: "payment", merchant: "영재", category: "기타", ts: 1, amount: 5000 }]);
    const r = await tidyWithClaude(s);
    expect(r.skipped).toBe(true);
    expect(s.data.spendTx[0]).toMatchObject({ category: "교육", autoCategory: { by: "rule" } });
    expect(BudgetPlugin.claudeMessages).not.toHaveBeenCalled();
  });
  test("keep 조건에서 빠진 내역의 가맹점은 보내지 않음", async () => {
    BudgetPlugin.claudeMessages.mockResolvedValue(reply({ items: [] }));
    const s = store(rows());
    await tidyWithClaude({ ...s, keep: ({ t }) => t.merchant !== "알수없음상점" });
    expect(BudgetPlugin.claudeMessages.mock.calls[0][0].body).not.toContain("알수없음상점");
  });
  test("보낼 것이 없으면 호출하지 않음", async () => {
    expect((await tidyWithClaude(store([]))).skipped).toBe(true);
    expect(BudgetPlugin.claudeMessages).not.toHaveBeenCalled();
  });
});

describe("3단계: 원문 읽기 도움(가짜 응답)", () => {
  test("잔액·번호·이름을 가림", () => {
    const masked = maskNotification("삼성5215 김*헌 12,000원 110-123-456789 잔액 345,000원");
    expect(masked).toContain("12,000원");
    ["5215", "김*헌", "110-123", "345,000"].forEach((v) => expect(masked).not.toContain(v));
  });
  test("동의 없으면 보내지 않고, 동의하면 가린 문장만 보냄", async () => {
    const db = { put: jest.fn() };
    const add = jest.fn().mockResolvedValue("new");
    const notis = [{ id: "n", ts: 5, title: "삼성카드", text: "승인 110-123-456 AMAZON 18,000원 잔액 9,000원", sourceId: "samsung" }];
    expect((await parseRawWithClaude(notis, { db, add })).error).toBeTruthy();
    expect(BudgetPlugin.claudeMessages).not.toHaveBeenCalled();
    setRawConsent(true);
    BudgetPlugin.claudeMessages.mockResolvedValue(reply({ items: [{ id: 0, isExpense: true, amount: 18000, merchant: "AMAZON", kind: "payment", confidence: 0.95 }] }));
    expect(await parseRawWithClaude(notis, { db, add })).toMatchObject({ saved: 1 });
    const sent = BudgetPlugin.claudeMessages.mock.calls[0][0].body;
    expect(sent).not.toContain("110-123");
    expect(sent).not.toContain("9,000원");
    expect(add.mock.calls[0][1]).toMatchObject({ amount: 18000, merchant: "AMAZON" });
  });
});

describe("거래내역서 가져오기(가정한 칸 이름)", () => {
  test("카드 내역: 날짜·시간 칸, 취소는 음수", () => {
    const rows = [
      ["삼성카드 이용내역", "", "", ""],
      ["이용일", "이용시간", "가맹점명", "이용금액", "할부개월", "카드번호"],
      ["2026.10.05", "12:30", "스타벅스 강남점", "5,000", "", "1234-****"],
      ["2026.10.06", "09:10", "쿠팡", "120,000", "3", "1234-****"],
      ["2026.10.07", "10:00", "쿠팡", "-8,000", "", "1234-****"],
    ];
    const { items, skipped } = parseStatementRows(rows, "samsung");
    expect(skipped).toBe(0);
    expect(items[0]).toMatchObject({ ts: at(2026, 10, 5, 12, 30), merchant: "스타벅스 강남점", amount: 5000, kind: "payment" });
    expect(items[1]).toMatchObject({ installment: 3, amount: 120000 });
    expect(items[2]).toMatchObject({ kind: "refund", amount: 8000 });
    expect(JSON.stringify(items)).not.toContain("1234");
  });
  test("은행 내역: 입금·이체·대출 제외, 음수만 지출", () => {
    const rows = [
      ["거래일시", "구분", "거래금액", "거래 후 잔액", "내용"],
      ["2026-10-05 12:30:00", "체크카드결제", "-7,000", "100,000", "GS25"],
      ["2026-10-05 13:00:00", "입금", "500,000", "600,000", "급여"],
      ["2026-10-05 14:00:00", "이체", "-30,000", "570,000", "홍길동"],
      ["2026-10-05 15:00:00", "대출실행", "1,000,000", "1,570,000", "비상금대출"],
      ["2026-10-06 15:00:00", "체크카드취소", "7,000", "1,577,000", "GS25"],
    ];
    const { items, skipped } = parseStatementRows(rows, "kakaobank");
    expect(items.map((t) => [t.kind, t.amount])).toEqual([["payment", 7000], ["refund", 7000]]);
    expect(skipped).toBe(3);
    expect(JSON.stringify(items)).not.toContain("100,000");
  });
  test("칸을 못 찾으면 이유", () => {
    expect(parseStatementRows([["a", "b"], [1, 2]], "samsung").error).toBeTruthy();
  });
  test("엑셀 날짜 숫자", () => {
    expect(parseDateCell(46300.5).hasTime).toBe(true);
    expect(parseDateCell("20261005", "1230").ts).toBe(at(2026, 10, 5, 12, 30));
  });
  test("중복: 일시·금액·가맹점 일치. 시각 없으면 같은 날", () => {
    const existing = [{ kind: "payment", amount: 5000, merchant: "스타벅스", ts: at(2026, 10, 5, 12, 30) }];
    const item = (o) => ({ kind: "payment", amount: 5000, merchant: "스타벅스 강남점", ts: at(2026, 10, 5, 12, 30), hasTime: true, dateKey: "2026-10-05", ...o });
    const { fresh, duplicates } = planImport([
      item(),
      item({ ts: at(2026, 10, 5, 18), hasTime: true }),
      item({ hasTime: false, ts: at(2026, 10, 5) }),
      item({ amount: 6000 }),
    ], existing);
    expect(duplicates).toBe(2);
    expect(fresh).toHaveLength(2);
  });
});

describe("같은 이름 일괄 분류", () => {
  const pay = (id, merchant, category, extra = {}) => ({ id, kind: "payment", merchant, category, amount: 1000, ts: at(2026, 11, 1), ...extra });
  test("같은 이름만 바꾸고 기준 한 건·다른 이름·입금은 그대로, 되돌리면 원상복구", async () => {
    const s = store(
      [pay(1, "A마트 강남점", "기타"), pay(2, "A마트", "식비", { categoryLocked: true }), pay(3, "B카페", "식비"), pay(4, "A마트", "기타", { kind: "income" }), pay(5, "A마트", "기타", { suggestedCategory: "쇼핑" })],
      [pay(6, "A마트", "쇼핑")],
    );
    const base = { ...s.data.spendTx[0], store: "spendTx", category: "기타" };
    const r = await applyCategoryToSame(base, "기타", s);
    expect(r.count).toBe(3); // 2번(직접 정함)·6번, 추천이 남은 5번(이미 기타여도 확정 처리)
    expect(r.overwritten).toBe(1);
    expect(s.data.spendTx.find((t) => t.id === 2)).toMatchObject({ category: "기타", categoryLocked: true });
    expect(s.data.kakaoTx[0].category).toBe("기타");
    expect(s.data.spendTx.find((t) => t.id === 3).category).toBe("식비");
    expect(s.data.spendTx.find((t) => t.id === 4).category).toBe("기타");
    expect(sameMerchantMessage("기타", r)).toBe("같은 이름 3건도 '기타'로 바꿨어요 (직접 정한 1건 포함)");
    await r.undo();
    expect(s.data.spendTx.find((t) => t.id === 2)).toMatchObject({ category: "식비", categoryLocked: true });
    expect(s.data.kakaoTx[0].category).toBe("쇼핑");
  });
  test("keep 에서 뺀 내역은 건드리지 않음", async () => {
    const s = store([pay(1, "A마트", "식비"), pay(2, "A마트", "식비")]);
    const r = await applyCategoryToSame({ id: 1, store: "spendTx", merchant: "A마트" }, "기타", { ...s, keep: ({ t }) => t.id !== 2 });
    expect(r.count).toBe(0);
  });
  test("추천 확정: 같은 이름 추천·기존 내역 모두 바뀌고 묶음은 한 장, 되돌리면 추천 복구", async () => {
    const sug = (id, m) => pay(id, m, "기타", { suggestedCategory: "생활", suggestedConfidence: 0.4 });
    const s = store([sug(1, "주 드림월드플러스"), sug(2, "주  드림월드플러스"), sug(3, "주 드림월드플러스"), pay(4, "주 드림월드플러스", "쇼핑"), sug(5, "다른곳")]);
    const rows = s.data.spendTx.map((t) => ({ ...t, store: "spendTx" })).filter((t) => t.suggestedCategory);
    expect(groupByMerchant(rows).map((g) => g.rows.length)).toEqual([3, 1]);
    const r = await acceptSuggestionEverywhere(rows[0], "기타", s);
    expect(r.count).toBe(3);
    const done = s.data.spendTx.filter((t) => [1, 2, 3, 4].includes(t.id));
    expect(done.every((t) => t.category === "기타" && t.categoryLocked && !t.suggestedCategory)).toBe(true);
    expect(s.data.spendTx.find((t) => t.id === 5).suggestedCategory).toBe("생활");
    expect(loadMerchantRules()).toEqual({ "주 드림월드플러스": "기타" });
    await r.undo();
    expect(s.data.spendTx.find((t) => t.id === 2).suggestedCategory).toBe("생활");
    expect(s.data.spendTx.find((t) => t.id === 4).category).toBe("쇼핑");
  });
});
