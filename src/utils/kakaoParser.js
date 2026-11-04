// 카카오뱅크 알림 → 거래 초안. 공식 형식 문서가 없어 특정 문장에 맞추지 않고
// "카카오뱅크 알림인가 + 거래 신호 + 금액"으로 넓게 읽는다. 놓친 알림은 탭의 "인식 기록"에서 원문을 볼 수 있다.
export const KAKAOBANK_PACKAGE = "com.kakaobank.channel";

const AD_WORDS = ["이벤트", "광고", "혜택", "쿠폰", "금리", "특판", "추천", "미션", "챌린지", "캐시백", "수신거부", "받아보세요", "신청하세요", "예정"];
const DECLINED_WORDS = ["실패", "거절", "잔액 부족", "잔액부족", "한도 초과", "한도초과", "미승인"];
const CANCEL_WORDS = ["승인취소", "결제취소", "취소"];
const PAYMENT_WORDS = ["체크카드", "승인", "결제", "카드"];
const TRANSFER_WORDS = ["이체", "송금", "보내기", "보냈", "자동이체"];
const SIGNAL_WORDS = [...PAYMENT_WORDS, ...TRANSFER_WORDS, "출금", "입금", "취소", "환급", "받았"];

const NOISE_WORDS = ["카카오뱅크", "카뱅", "체크카드", "입출금통장", "입출금", "통장", "승인취소", "결제취소", "승인", "결제", "완료", "입금", "출금", "이체", "송금", "취소", "알림", "일시불", "Web발신", "사용", "카드", "내역", "계좌", "되었습니다", "됐어요", "했어요", "받았어요", "보냈어요"];

const has = (text, words) => words.some((w) => text.includes(w));

// 본문에 금융사 이름이 나올 수 있는 메신저·AI·메일 앱. 이 앱들의 알림은 금융사 알림으로 보지 않는다.
const NON_FINANCIAL_PACKAGES = [
  "com.anthropic.claude", "com.openai.chatgpt", "com.google.android.apps.bard", "com.google.android.googlequicksearchbox",
  "jp.naver.line.android", "org.telegram.messenger", "com.discord", "com.Slack", "com.slack", "com.whatsapp",
  "com.google.android.gm", "com.google.android.apps.docs", "com.microsoft.teams", "com.facebook.orca", "com.instagram.android",
];
export const isNonFinancialApp = (pkg) => NON_FINANCIAL_PACKAGES.includes(pkg);

export const isKakaoBankNotification = (noti) => {
  if (!noti) return false;
  if (noti.package === KAKAOBANK_PACKAGE) return true;
  if (isNonFinancialApp(noti.package)) return false;
  // 카카오톡은 친구 대화에 "카카오뱅크"가 나올 수 있어 보낸 곳(제목)이 카카오뱅크일 때만 인정한다.
  if (noti.package === "com.kakao.talk") return /카카오뱅크|카뱅/.test(noti.title || "");
  return /카카오뱅크|카뱅/.test(`${noti.title || ""} ${noti.text || ""}`);
};

const cleanMerchant = (text, kind) => {
  const stripped = text
    .replace(/-?[\d,]+\s*(?:원|KRW)/g, " ")
    .replace(/\d{1,2}[/.-]\d{1,2}/g, " ")
    .replace(/\d{1,2}:\d{2}(?::\d{2})?/g, " ")
    .replace(/[\d*]{3,}(?:-[\d*]+)*/g, " ")
    .replace(/[|·•:;,/()[\]{}<>]/g, " ");
  const tokens = stripped.split(/\s+/).filter((t) => t.length > 0).map((t) => {
    let word = t;
    NOISE_WORDS.forEach((n) => { word = word.split(n).join(""); });
    return word.replace(/님$/, "").trim();
  }).filter((t) => t.length > 1 || /[A-Za-z가-힣]/.test(t));
  const merchant = tokens.join(" ").trim();
  if (merchant) return merchant.slice(0, 40);
  return kind === "income" ? "입금" : kind === "transfer" ? "이체" : "카카오뱅크 결제";
};

// 반환: { result: "tx", tx } 또는 { result: "ignored"|"declined", reason }
export const parseKakaoNotification = (noti) => {
  if (!isKakaoBankNotification(noti)) return { result: "ignored", reason: "카카오뱅크 알림 아님" };
  const raw = `${noti.title || ""} ${noti.text || ""}`.replace(/\s+/g, " ").trim();

  if (has(raw, DECLINED_WORDS)) return { result: "declined", reason: "실패·거절 알림" };
  if (/(^|\s)내일(은|\s)|날이에요|부족해요|채워\s?주세요|확인\s?해\s?주세요/.test(raw)) return { result: "ignored", reason: "예정·안내 문구" };
  if (!has(raw, SIGNAL_WORDS)) return { result: "ignored", reason: "거래 신호 없음" };
  // 광고 문구는 "입금·출금·승인" 같은 말이 금액 없이 또는 함께 섞여 오므로, 광고어가 있으면 분명한 카드·입출금 신호일 때만 통과시킨다.
  if (has(raw, AD_WORDS) && !/(승인|출금|입금)\s*[:|]?\s*[\d,]+\s*원|[\d,]+\s*원\s*(승인|출금|입금|결제)/.test(raw)) {
    return { result: "ignored", reason: "광고·안내 문구" };
  }

  let balanceAfter = null;
  const balanceMatch = raw.match(/잔액\s*:?\s*(-?[\d,]+)\s*원/);
  if (balanceMatch) balanceAfter = parseInt(balanceMatch[1].replace(/,/g, ""), 10);

  const withoutMeta = raw
    .replace(/(?:잔액|누적|한도)\s*:?\s*-?[\d,]+\s*원/g, " ")
    .replace(/\s+/g, " ");
  const amountMatch = withoutMeta.match(/([\d][\d,]*)\s*(?:원|KRW)/);
  if (!amountMatch) return { result: "ignored", reason: "금액 없음" };
  const amount = parseInt(amountMatch[1].replace(/,/g, ""), 10);
  if (!amount || amount <= 0) return { result: "ignored", reason: "금액 없음" };

  let kind;
  if (has(withoutMeta, CANCEL_WORDS)) kind = "refund";
  else if (/입금|환급|받았/.test(withoutMeta)) kind = "income";
  else if (has(withoutMeta, TRANSFER_WORDS) || /충전/.test(withoutMeta)) kind = "transfer";
  else kind = "payment"; // "출금 12,000원 스타벅스"처럼 카드 결제가 출금으로 오는 경우 포함. 틀리면 탭에서 고칠 수 있다.

  const ts = noti.time || Date.now();
  return {
    result: "tx",
    tx: {
      ts,
      kind,
      amount,
      merchant: cleanMerchant(withoutMeta, kind),
      balanceAfter: Number.isNaN(balanceAfter) ? null : balanceAfter,
      // 대출 실행·상환은 통장 잔액과 대출액이 같이 움직여 순자금이 변하지 않는다. 이자는 실제 지출이라 제외하지 않는다.
      excludeFromFlow: /대출/.test(withoutMeta) && !/이자/.test(withoutMeta),
      inputMode: "auto",
      pkg: noti.package || "",
    },
  };
};

// 이미 저장된 거래와 같은 알림인지 — 같은 앱은 1초 이내(재처리), 다른 앱은 5분 이내(카뱅 푸시 + 카톡 알림톡)면 중복으로 본다.
export const isDuplicateKakaoTx = (tx, existing) =>
  existing.some((e) => {
    if (e.isDeleted || e.amount !== tx.amount || e.kind !== tx.kind) return false;
    const gap = Math.abs(e.ts - tx.ts);
    return (e.pkg || "") === (tx.pkg || "") ? gap < 1000 : gap < 5 * 60 * 1000;
  });

// 결제 취소 알림에 해당하는 원래 결제 — 같은 금액의 가장 최근 결제(가맹점이 겹치면 우선).
export const findCancelTarget = (refund, existing) => {
  const limit = 90 * 24 * 60 * 60 * 1000;
  const candidates = existing
    .filter((e) => !e.isDeleted && e.kind === "payment" && e.amount === refund.amount && e.ts <= refund.ts && refund.ts - e.ts < limit)
    .sort((a, b) => b.ts - a.ts);
  return candidates.find((e) => e.merchant.includes(refund.merchant) || refund.merchant.includes(e.merchant)) || candidates[0] || null;
};
