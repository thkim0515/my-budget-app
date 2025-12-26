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
  { category: "편의점", keywords: ["GS25", "CU", "세븐일레븐", "미니스톱", "이마트24"] },
  { category: "구독", keywords: ["넷플릭스", "Netflix", "Spotify", "유튜브", "디즈니", "쿠팡와우"] },
  { category: "배달", keywords: ["배민", "요기요", "쿠팡이츠", "배달의민족"] },
  { category: "쇼핑", keywords: ["쿠팡", "마켓컬리", "11번가", "네이버페이", "지마켓", "옥션"] },
  { category: "교통", keywords: ["택시", "카카오T", "지하철", "버스", "철도", "코레일"] },
  { category: "식비", keywords: ["식당", "카페", "스타벅스", "투썸", "음식점", "베이커리"] },
];

const detectCategory = (text) => {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => text.includes(keyword))) {
      return rule.category;
    }
  }
  return "기타";
};

export const parseAndCreateRecord = (text) => {
  if (!text || typeof text !== "string") return null;

  // 1. 텍스트 정제 (줄바꿈 제거 및 특수문자 공백화)
  // const cleanText = text.replace(/\n+/g, " ").replace(/[\[\]\(\)]/g, " ").replace(/\s+/g, " ").trim();
  const cleanText = text
    .replace(/\n+/g, " ")
    .replace(/[[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();




  // 2. 금액 추출 (숫자 + '원' 또는 'KRW') - 가장 핵심 데이터
  const amountMatch = cleanText.match(/([\d,]+)\s*(?:원|KRW)/);
  if (!amountMatch) return null; // 금액이 없으면 지출 알림이 아님

  const amount = parseInt(amountMatch[1].replace(/,/g, ""), 10);
  if (isNaN(amount) || amount <= 0) return null;

  // 3. 결제 수단 추정 (텍스트에서 카드/은행 키워드 탐색)
  const sourceKeywords = ["카드", "은행", "뱅크", "페이", "체크", "카카오", "신한", "국민", "현대", "삼성", "우리", "하나", "롯데"];
  let paymentSource = "기타";
  const words = cleanText.split(" ");
  for (const word of words) {
    if (sourceKeywords.some(k => word.includes(k))) {
      paymentSource = word;
      break;
    }
  }

  // 4. 상호명(Title) 추출
  // 금액 정보와 날짜, 시간, 결제 관련 수식어를 제외한 나머지 텍스트를 상호명으로 간주
  const excludeKeywords = ["승인", "결제", "완료", "입금", "출금", "일시불", "타인", "원", "KRW"];
  const timeRegex = /(\d{1,2}:\d{1,2})|(\d{1,2}\/\d{1,2})/;
  
  const titleCandidate = words.filter(word => 
    !word.includes(amountMatch[1]) && // 금액 숫자 제외
    !excludeKeywords.some(k => word.includes(k)) && // 수식어 제외
    !timeRegex.test(word) && // 시간/날짜 제외
    word !== paymentSource // 결제수단 제외
  ).join(" ").trim();

  const finalTitle = titleCandidate || "지출 내역";
  
  // 5. 날짜 처리 (현재 시간 기준)
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];

  return {
    title: finalTitle,
    source: paymentSource,
    amount,
    type: "expense",
    category: detectCategory(cleanText),
    date: dateStr,
    chapterTitle: formatChapterTitle(dateStr),
    isPaid: true, // 자동 저장 내역은 기본적으로 완료 상태
    createdAt: now,
  };
};