// 금융사별 알림 → 지출 초안. 승인 문자는 "이름 금액 할부 날짜 시각 가맹점 누적" 순서가 많아 그 구조로 읽고,
// 못 읽으면 "미분류"로 돌려 사용자가 확인하게 한다. 삼성 형식 외의 실제 문구는 사용하면서 맞춰 가야 한다.

// pay: 카드·계좌를 대신 결제하는 곳 — 같은 결제 알림이 카드사에서도 올 수 있어 중복 판단에 쓴다.
export const SOURCES = [
  { id: "kakaobank", name: "카카오뱅크", packages: ["com.kakaobank.channel"], keywords: [/카카오뱅크/, /카뱅/] },
  { id: "samsung", name: "삼성카드", recordSource: "삼성카드", packages: ["kr.co.samsungcard.mpocket"], keywords: [/삼성카드/, /삼성\d{4}/] },
  { id: "shinhan", name: "신한카드", recordSource: "신한카드", packages: ["com.shcard.smartpay", "com.shinhan.sbanking"], keywords: [/신한카드/, /신한은행/, /신한\d{4}/] },
  { id: "kb", name: "KB국민카드", recordSource: "국민카드", packages: ["com.kbcard.cxh.appcard", "com.kbstar.kbbank"], keywords: [/KB국민/, /국민카드/, /KB카드/, /KB\d{4}/, /국민\d{4}/] },
  { id: "hyundai", name: "현대카드", recordSource: "현대카드", packages: ["com.hyundaicard.appcard"], keywords: [/현대카드/, /현대\d{4}/] },
  { id: "lotte", name: "롯데카드", recordSource: "롯데카드", packages: ["com.lcacApp"], keywords: [/롯데카드/, /롯데\d{4}/] },
  { id: "woori", name: "우리카드·은행", recordSource: "우리은행", packages: ["com.wooricard.smartapp", "com.wooribank.smart.npib"], keywords: [/우리카드/, /우리은행/, /우리\d{4}/] },
  { id: "hana", name: "하나카드·은행", recordSource: "하나카드", packages: ["com.hanaskcard.paycla", "com.kebhana.hanapush"], keywords: [/하나카드/, /하나은행/, /하나\d{4}/] },
  { id: "nh", name: "NH농협", recordSource: "농협은행", packages: ["nh.smart.nhallonepay", "nh.smart.banking"], keywords: [/NH카드/, /NH농협/, /농협카드/, /농협은행/, /NH\d{4}/, /농협\d{4}/] },
  { id: "toss", name: "토스", recordSource: "토스뱅크", packages: ["viva.republica.toss"], keywords: [/토스뱅크/, /토스카드/, /토스페이/], pay: true },
  { id: "naverpay", name: "네이버페이", packages: ["com.naverfin.payapp"], keywords: [/네이버페이/, /Npay/i], pay: true },
  { id: "kakaopay", name: "카카오페이", recordSource: "카카오페이", packages: ["com.kakaopay.app"], keywords: [/카카오페이/], pay: true },
];
export const SPEND_CATEGORIES = ["식비", "편의점", "배달", "쇼핑", "교통", "생활", "구독", "의료", "기타"];
export const sourceById = (id) => SOURCES.find((s) => s.id === id);
export const ALL_PACKAGES = SOURCES.flatMap((s) => s.packages);

const SMS_PACKAGES = ["com.samsung.android.messaging", "com.google.android.apps.messaging", "com.android.mms", "com.android.messaging"];
const KAKAOTALK = "com.kakao.talk";

const hasKeyword = (source, text) => source.keywords.some((k) => k.test(text));

// 체크한 금융사 중 이 알림의 출처. channel — own: 금융사 앱, message: 문자·알림톡, other: 그 밖의 앱(이름이 들어 있는 경우).
// 카카오톡은 친구 대화에 카드사 이름이 나올 수 있어 보낸 곳(제목)이 금융사일 때만 인정한다.
export const matchSource = (noti, selectedIds) => {
  const selected = SOURCES.filter((s) => selectedIds.includes(s.id));
  const pkg = noti.package || "";
  const own = selected.find((s) => s.packages.includes(pkg));
  if (own) return { source: own, channel: "own" };
  // 체크하지 않은 금융사의 앱 알림은 본문에 다른 카드 이름이 있어도 보지 않는다.
  if (SOURCES.some((s) => s.packages.includes(pkg))) return null;
  const title = noti.title || "";
  const full = `${title} ${noti.text || ""}`;
  if (pkg === KAKAOTALK) {
    const s = selected.find((x) => hasKeyword(x, title));
    return s ? { source: s, channel: "message" } : null;
  }
  const s = selected.find((x) => hasKeyword(x, full));
  if (!s) return null;
  return { source: s, channel: SMS_PACKAGES.includes(pkg) ? "message" : "other" };
};

const AD_WORDS = ["이벤트", "광고", "혜택", "쿠폰", "할인", "적립", "금리", "특판", "추천", "미션", "챌린지", "캐시백", "수신거부", "받아보세요", "신청하세요"];
const BILLING = /결제\s*예정|청구|납부|명세서|결제일|이용대금/;
const DECLINED = /실패|거절|잔액\s*부족|한도\s*초과|미승인/;
const STRONG = /(승인|출금|결제\s*완료)[^\d]{0,20}[\d,]+\s*원|[\d,]+\s*원[^\d]{0,12}(승인|출금|결제\s*완료)/;
const SIGNAL = /승인|결제|출금|취소|이체|송금|사용/;
const FOREIGN = /[\d.,]+\s*(USD|달러|EUR|유로|JPY|엔화|\$)/;
const NOISE = ["체크카드", "신용카드", "승인취소", "결제취소", "승인", "결제", "완료", "출금", "이체", "송금", "취소", "사용", "알림", "일시불", "Web발신", "내역", "카드", "해외", "되었습니다", "됐어요", "했어요", "님"];

// 본문의 날짜·시각. 없으면 알림이 온 시각. 연도가 없어 알림 시각보다 하루 넘게 미래면 작년으로 본다.
export const parseWhen = (text, time) => {
  const base = new Date(time);
  const m = text.match(/(\d{1,2})\s*[/.-]\s*(\d{1,2})\s+(\d{1,2}):(\d{2})/) || text.match(/(\d{1,2})월\s*(\d{1,2})일\s*(\d{1,2})[:시]\s*(\d{1,2})/);
  if (!m) return { ts: time, end: -1 };
  const [mo, d, h, mi] = m.slice(1, 5).map(Number);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || h > 23 || mi > 59) return { ts: time, end: -1 };
  let parsed = new Date(base.getFullYear(), mo - 1, d, h, mi);
  if (parsed.getTime() > time + 24 * 3600 * 1000) parsed = new Date(base.getFullYear() - 1, mo - 1, d, h, mi);
  return { ts: parsed.getTime(), end: m.index + m[0].length };
};

const cleanWords = (text, source) => {
  let t = text
    .replace(/(?:누적|잔액|잔여한도|한도)\s*:?\s*-?[\d,]*\s*원?.*$/, " ")
    .replace(/-?[\d,]+\s*(?:원|KRW)/g, " ")
    .replace(/\d{1,2}\s*개월|할부\s*\d*|\d{1,2}[/.-]\d{1,2}|\d{1,2}:\d{2}(?::\d{2})?/g, " ")
    .replace(/[\d*]{3,}(?:-[\d*]+)*/g, " ")
    .replace(/[가-힣A-Za-z]\*+[가-힣A-Za-z]?/g, " ")
    .replace(/[|·•:;,/()[\]{}<>]/g, " ");
  source.keywords.forEach((k) => { t = t.replace(new RegExp(k.source, "g"), " "); });
  return t.split(/\s+/).map((w) => {
    let word = w;
    NOISE.forEach((n) => { word = word.split(n).join(""); });
    return word.trim();
  }).filter((w) => w.length > 0).join(" ").trim();
};

// 반환: { result: "tx", tx } | { result: "unclassified", reason } | { result: "ignored", reason }
export const parseSpendNotification = (noti, source, channel = "own") => {
  const text = `${noti.text || ""}`.replace(/\s+/g, " ").trim();
  const raw = `${noti.title || ""} ${text}`.trim();
  const time = noti.time || Date.now();
  const unsure = (reason) => (channel === "other" ? { result: "ignored", reason } : { result: "unclassified", reason });

  if (DECLINED.test(raw)) return { result: "ignored", reason: "실패·거절 알림" };
  if (BILLING.test(raw)) return { result: "ignored", reason: "청구·납부 안내" };
  const hasAd = AD_WORDS.some((w) => raw.includes(w));
  if (hasAd && (channel === "other" || !STRONG.test(raw))) return { result: "ignored", reason: "광고·안내 문구" };

  const withoutMeta = raw.replace(/(?:누적|잔액|잔여한도|한도|포인트)\s*:?\s*-?[\d,]+\s*(?:원|P)?/g, " ");
  const amountMatch = withoutMeta.match(/([\d][\d,]*)\s*(?:원|KRW)/);
  const signal = SIGNAL.test(withoutMeta);
  if (/입금|환급/.test(withoutMeta) && !/취소/.test(withoutMeta)) return { result: "ignored", reason: "입금은 지출이 아님" };
  if (!amountMatch) {
    if (FOREIGN.test(withoutMeta) && signal) return unsure("외화 결제 — 원화 금액 확인 필요");
    return signal ? unsure("금액을 찾지 못함") : { result: "ignored", reason: "거래 알림 아님" };
  }
  if (!signal) return unsure("거래 구분을 알 수 없음");
  if (channel === "other" && !STRONG.test(withoutMeta)) return { result: "ignored", reason: "거래 알림 아님" };
  const amount = parseInt(amountMatch[1].replace(/,/g, ""), 10);
  if (!amount) return unsure("금액을 찾지 못함");

  // 전체 소비는 사용한 금액만 모은다. 이체·대출은 돈이 옮겨 갈 뿐이라 뺀다.
  const kind = /취소/.test(withoutMeta) ? "refund" : "payment";
  if (kind === "payment" && /이체|송금|보내기|보냈/.test(withoutMeta)) return { result: "ignored", reason: "이체는 지출이 아님" };
  if (/대출/.test(withoutMeta) && !/이자/.test(withoutMeta)) return { result: "ignored", reason: "대출 실행·상환은 지출이 아님" };

  const installMatch = withoutMeta.match(/(\d{1,2})\s*개월|할부\s*(\d{1,2})/);
  const installment = installMatch ? Number(installMatch[1] || installMatch[2]) : 0;

  const { ts, end } = parseWhen(text, time);
  // 시각 뒤에 오는 말이 가맹점인 형식을 먼저 보고, 없으면 전체에서 잡음을 뺀 나머지를 쓴다.
  const merchant = (end >= 0 && cleanWords(text.slice(end), source)) || cleanWords(raw, source);
  if (!merchant) return unsure("가맹점을 찾지 못함");

  return {
    result: "tx",
    tx: { ts, kind, amount, merchant: merchant.slice(0, 40), installment, inputMode: "auto", pkg: noti.package || "", sourceId: source.id },
  };
};

// 같은 출처: 같은 앱은 1초 안(재처리), 다른 경로(앱+문자)는 5분 안이면 중복.
// 다른 출처: 어느 한쪽이 페이면 3분 안의 같은 금액을 같은 결제로 본다(페이 결제와 카드 승인 알림이 함께 오는 경우).
export const findDuplicate = (tx, existing) => existing.find((e) => {
  if (e.isDeleted || e.amount !== tx.amount || e.kind !== tx.kind) return false;
  const gap = Math.abs(e.ts - tx.ts);
  if (e.sourceId === tx.sourceId) return (e.pkg || "") === (tx.pkg || "") ? gap < 1000 : gap < 5 * 60 * 1000;
  const eitherPay = sourceById(e.sourceId)?.pay || sourceById(tx.sourceId)?.pay;
  return !!eitherPay && gap < 3 * 60 * 1000;
});
