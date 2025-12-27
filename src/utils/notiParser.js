/**
 * 상세 페이지의 제목 규칙과 동일하게 변환 (예: 2025년 12월)
 */
export const formatChapterTitle = (dateString) => {
  const d = new Date(dateString);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return `${year}년 ${month}월`;
};

const CATEGORY_RULES = [
  { category: "편의점", keywords: ["gs25", "cu", "세븐일레븐", "미니스톱", "이마트24", "편의점"] },
  { category: "구독", keywords: ["넷플릭스", "netflix", "spotify", "유튜브", "디즈니", "쿠팡와우"] },
  { category: "배달", keywords: ["배민", "요기요", "쿠팡이츠", "배달의민족"] },
  { category: "쇼핑", keywords: ["쿠팡", "마켓컬리", "11번가", "네이버페이", "지마켓", "옥션", "다이소"] },
  { category: "교통", keywords: ["택시", "카카오t", "지하철", "버스", "철도", "코레일"] },
  { category: "식비", keywords: ["식당", "카페", "스타벅스", "투썸", "음식점", "베이커리", "메가커피", "컴포즈"] },
];

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

  // 1. 텍스트 정제 (불필요한 기호 제거 및 공백 통일)
  const cleanText = text
    .replace(/\n+/g, " ")
    .replace(/[\[\]\(\)]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // 2. 금액 추출 (숫자와 쉼표 조합 뒤에 '원' 또는 'KRW'가 오는 경우)
  // 예: "12,000원", "130,000 원" 모두 대응
  const amountMatch = cleanText.match(/([\d,]+)\s*(?:원|KRW)/);
  if (!amountMatch) return null;

  const amount = parseInt(amountMatch[1].replace(/,/g, ""), 10);
  if (isNaN(amount) || amount <= 0) return null;

  // 3. 결제 수단 추정
  const sourceKeywords = ["카드", "은행", "뱅크", "페이", "체크", "카카오", "신한", "국민", "현대", "삼성", "우리", "하나", "롯데", "농협"];
  let paymentSource = "기타";
  const words = cleanText.split(" ");

  for (const word of words) {
    if (sourceKeywords.some((k) => word.includes(k))) {
      paymentSource = word;
      break;
    }
  }

  // 4. 상호명(Title) 추출
  // 제외할 단어들
  const excludeKeywords = ["승인", "결제", "완료", "입금", "출금", "일시불", "타인", "원", "KRW", "건당"];
  const timeRegex = /(\d{1,2}:\d{1,2})|(\d{1,2}\/\d{1,2})/; // 시간 및 날짜 형태(12/27) 제외

  const titleParts = words.filter((word) => {
    const isAmount = word.includes(amountMatch[1]);
    const isExcluded = excludeKeywords.some((k) => word.includes(k));
    const isTime = timeRegex.test(word);
    const isSource = word === paymentSource;
    return !isAmount && !isExcluded && !isTime && !isSource;
  });

  const finalTitle = titleParts.join(" ").trim() || "지출 내역";

  // 5. 날짜 처리
  const now = new Date();
  const dateStr = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");

  return {
    title: finalTitle,
    source: paymentSource,
    amount,
    type: "expense", // DB 설계에 따라 'out' 일 수도 있으니 확인 필요
    category: detectCategory(cleanText),
    date: dateStr,
    chapterTitle: formatChapterTitle(dateStr),
    isPaid: true,
    createdAt: now,
  };
};
