import { db } from "../db/firebase";
import { doc, onSnapshot } from "firebase/firestore";

/**
 * 상세 페이지의 제목 규칙과 동일하게 변환 (예: 2025년 12월)
 */
export const formatChapterTitle = (dateString) => {
  const d = new Date(dateString);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return `${year}년 ${month}월`;
};

// 인터넷 미연결 시 사용할 기본값 (Fallback Data)
let CATEGORY_RULES = [
  { category: "편의점", keywords: ["gs25", "cu", "세븐일레븐", "미니스톱", "이마트24", "편의점"] },
  { category: "구독", keywords: ["넷플릭스", "netflix", "spotify", "유튜브", "디즈니", "쿠팡와우", "네이버플러스"] },
  { category: "배달", keywords: ["배민", "요기요", "쿠팡이츠", "배달의민족"] },
  { category: "쇼핑", keywords: ["쿠팡", "마켓컬리", "11번가", "네이버페이", "지마켓", "옥션", "다이소", "올리브영"] },
  { category: "교통", keywords: ["택시", "카카오t", "지하철", "버스", "철도", "코레일", "srt", "하이패스"] },
  { category: "식비", keywords: ["식당", "카페", "스타벅스", "투썸", "음식점", "베이커리", "메가커피", "컴포즈", "빽다방"] },
  { category: "의료", keywords: ["병원", "의원", "약국", "치과", "내과", "피부과"] },
  { category: "생활", keywords: ["관리비", "도시가스", "전기요금", "수도요금", "통신비"] },
  { category: "이체", keywords: ["이체", "송금", "보내기"] }
];

let bankMap = [
  { key: "삼성", name: "삼성카드" },
  { key: "카카오뱅크", name: "카카오뱅크" },
  { key: "국민", name: "국민카드" },
  { key: "KB", name: "국민카드" },
  { key: "신한", name: "신한카드" },
  { key: "우리", name: "우리은행" },
  { key: "하나", name: "하나카드" },
  { key: "농협", name: "농협은행" },
  { key: "NH", name: "농협은행" },
  { key: "현대", name: "현대카드" },
  { key: "롯데", name: "롯데카드" },
  { key: "토스", name: "토스뱅크" },
  { key: "케이뱅크", name: "케이뱅크" },
  { key: "기업", name: "IBK기업은행" },
  { key: "우체국", name: "우체국" },
  { key: "카카오페이", name: "카카오페이" }
];

/**
 * 2. Firestore 실시간 동기화 (onSnapshot)
 * 관리자가 파이어스토어에서 규칙을 바꾸면 앱 재시작 없이 즉시 반영
 */
export const syncParsingRules = () => {
  const docRef = doc(db, "config", "parserRules");
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.CATEGORY_RULES) CATEGORY_RULES = data.CATEGORY_RULES;
      if (data.bankMap) bankMap = data.bankMap;
      console.log("파싱 규칙 실시간 동기화 완료");
    }
  }, (error) => {
    console.warn("규칙 동기화 실패 (기본값 사용):", error);
  });
};

const detectCategory = (text) => {
  const lowerText = text.toLowerCase();
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => lowerText.includes(keyword.toLowerCase()))) {
      return rule.category;
    }
  }
  return "기타";
};

export const parseAndCreateRecord = (text) => {
  if (!text || typeof text !== "string") return null;

  const cleanText = text.replace(/\n+/g, " ").replace(/[()[\]]/g, " ").replace(/\s+/g, " ").trim();

  // 금액 추출
  const amountMatch = cleanText.match(/([\d,]+)\s*(?:원|KRW)/);
  if (!amountMatch) return null;
  const amount = parseInt(amountMatch[1].replace(/,/g, ""), 10);
  if (isNaN(amount) || amount <= 0) return null;

  // 상태 분석
  const isCancellation = ["취소", "승인취소", "결제취소"].some(k => cleanText.includes(k));
  const isTransfer = ["이체", "송금", "보내기"].some(k => cleanText.includes(k));
  const isIncome = (["입금", "환급", "받으세요"].some(k => cleanText.includes(k)) || cleanText.includes("보낸분")) && !isCancellation;
  const type = isIncome ? "income" : "expense";

  // 결제 수단 추출
  let paymentSource = "기타";
  for (const b of bankMap) {
    if (cleanText.includes(b.key)) {
      paymentSource = b.name;
      break;
    }
  }

  // 상호명 추출 및 노이즈 제거
  const excludeKeywords = ["승인", "결제", "완료", "입금", "출금", "원", "KRW", "Web발신", "잔액", "카드", "뱅크", "취소", "이체", "송금"];
  const noiseRegex = /(\d{1,2}:\d{1,2})|(\d{1,2}\/\d{1,2})|(\d{4})|(\*+)/g;

  const words = cleanText.split(" ");
  const titleParts = words.filter((word) => {
    const isAmt = word.includes(amountMatch[1]);
    const isExc = excludeKeywords.some((k) => word.includes(k));
    const isNoise = noiseRegex.test(word);
    const isSrc = word.includes(paymentSource.replace("카드", "").replace("뱅크", ""));
    return !isAmt && !isExc && !isNoise && !isSrc && word.length > 1;
  });

  const finalTitle = titleParts.join(" ").trim() || (isTransfer ? "계좌 이체" : isIncome ? "입금 내역" : "지출 내역");

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  return {
    title: finalTitle,
    source: paymentSource,
    amount,
    type,
    isCancellation,
    isTransfer,
    category: detectCategory(cleanText),
    date: dateStr,
    chapterTitle: formatChapterTitle(dateStr), // formatChapterTitle 함수 사용
    isPaid: true,
    createdAt: now,
    updatedAt: Date.now(),
    isDeleted: false
  };
};