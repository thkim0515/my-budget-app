import { findCancelTarget, isDuplicateKakaoTx, parseKakaoNotification, KAKAOBANK_PACKAGE } from "./kakaoParser";

const noti = (title, text, extra = {}) => ({ title, text, package: KAKAOBANK_PACKAGE, time: 1000000, ...extra });

// 실제 알림 원문을 확보하지 못해 흔한 은행 알림 문장을 가정한 예시다.
describe("카카오뱅크 알림 해석", () => {
  test("체크카드 결제", () => {
    const { tx } = parseKakaoNotification(noti("카카오뱅크", "체크카드 승인 12,300원 스타벅스 강남점 잔액 345,000원"));
    expect(tx).toMatchObject({ kind: "payment", amount: 12300, balanceAfter: 345000 });
    expect(tx.merchant).toContain("스타벅스");
  });
  test("출금으로 오는 결제와 음수 잔액", () => {
    const { tx } = parseKakaoNotification(noti("입출금통장(1234)", "출금 5,000원 | GS25 역삼점 | 잔액 -120,000원"));
    expect(tx).toMatchObject({ kind: "payment", amount: 5000, balanceAfter: -120000 });
    expect(tx.merchant).toContain("GS25");
  });
  test("입금·이체", () => {
    expect(parseKakaoNotification(noti("카카오뱅크", "입금 2,000,000원 급여")).tx.kind).toBe("income");
    expect(parseKakaoNotification(noti("카카오뱅크", "홍길동님에게 이체 30,000원")).tx.kind).toBe("transfer");
  });
  test("결제 취소", () => {
    expect(parseKakaoNotification(noti("카카오뱅크", "체크카드 승인취소 8,000원 쿠팡")).tx.kind).toBe("refund");
  });
  test("대출 실행은 자금 흐름 제외, 이자는 포함", () => {
    expect(parseKakaoNotification(noti("카카오뱅크", "비상금대출 입금 500,000원")).tx.excludeFromFlow).toBe(true);
    expect(parseKakaoNotification(noti("카카오뱅크", "대출 이자 출금 3,000원")).tx.excludeFromFlow).toBe(false);
  });
  test("광고·실패·타사 알림은 저장하지 않는다", () => {
    expect(parseKakaoNotification(noti("카카오뱅크", "이벤트 참여하고 최대 5,000원 캐시백 받아보세요")).result).toBe("ignored");
    expect(parseKakaoNotification(noti("카카오뱅크", "체크카드 승인 실패 12,000원 잔액 부족")).result).toBe("declined");
    expect(parseKakaoNotification({ title: "삼성카드", text: "승인 1,000원", package: "x", time: 1 }).result).toBe("ignored");
  });
  test("카카오톡으로 온 카카오뱅크 알림톡도 인식", () => {
    const r = parseKakaoNotification({ title: "카카오뱅크", text: "결제 7,000원 김밥천국", package: "com.kakao.talk", time: 1 });
    expect(r.tx.kind).toBe("payment");
  });
});

describe("중복·취소", () => {
  const base = { kind: "payment", amount: 1000, merchant: "A", ts: 1000000, pkg: "p1" };
  test("다른 앱 5분 안은 중복, 같은 앱 연속 결제는 허용", () => {
    expect(isDuplicateKakaoTx({ ...base, pkg: "p2", ts: 1100000 }, [base])).toBe(true);
    expect(isDuplicateKakaoTx({ ...base, ts: 1100000 }, [base])).toBe(false);
    expect(isDuplicateKakaoTx({ ...base, ts: 1000500 }, [base])).toBe(true);
  });
  test("취소 대상은 가맹점 일치 우선", () => {
    const a = { ...base, id: "a", merchant: "쿠팡", ts: 500 };
    const b = { ...base, id: "b", merchant: "GS25", ts: 800 };
    expect(findCancelTarget({ amount: 1000, merchant: "쿠팡", ts: 900 }, [a, b]).id).toBe("a");
    expect(findCancelTarget({ amount: 1000, merchant: "없음", ts: 900 }, [a, b]).id).toBe("b");
    expect(findCancelTarget({ amount: 2000, merchant: "쿠팡", ts: 900 }, [a, b])).toBeNull();
  });
});
