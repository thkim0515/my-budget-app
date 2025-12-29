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

  // 텍스트 정제 (줄바꿈 제거 및 공백 통일)
  // const cleanText = text.replace(/\n+/g, " ").replace(/[\[\]\(\)]/g, " ").replace(/\s+/g, " ").trim();
  const cleanText = text
    .replace(/\n+/g, " ")
    .replace(/[()[\]]/g, " ")
    .replace(/\s+/g, " ")
    .trim();


  // 금액 추출
  const amountMatch = cleanText.match(/([\d,]+)\s*(?:원|KRW)/);
  if (!amountMatch) return null;
  const amount = parseInt(amountMatch[1].replace(/,/g, ""), 10);
  if (isNaN(amount) || amount <= 0) return null;

  // 결제 취소 여부 확인
  const cancelKeywords = ["취소", "승인취소", "결제취소", "취소승인"];
  const isCancellation = cancelKeywords.some(k => cleanText.includes(k));

  // 입금/지출(income/expense) 구분
  const incomeKeywords = ["입금", "환급", "입금완료", "받으세요", "수입"];
  const isIncome = incomeKeywords.some(k => cleanText.includes(k)) && !isCancellation;
  const type = isIncome ? "income" : "expense";

  // 결제 수단(은행/카드사) 표준화 추출
  const bankMap = [
    { key: "삼성", name: "삼성카드" },
    { key: "카카오뱅크", name: "카카오뱅크" },
    { key: "국민", name: "국민카드" },
    { key: "KB", name: "국민카드" },
    { key: "신한", name: "신한카드" },
    { key: "우리", name: "우리은행" },
    { key: "하나", name: "하나카드" },
    { key: "농협", name: "농협은행" },
    { key: "현대", name: "현대카드" },
    { key: "롯데", name: "롯데카드" },
    { key: "카카오페이", name: "카카오페이" },
  ];
  
  let paymentSource = "기타";
  for (const b of bankMap) {
    if (cleanText.includes(b.key)) {
      paymentSource = b.name;
      break;
    }
  }

  // 6. 상호명(Title) 추출 및 노이즈 제거 강화
  const excludeKeywords = [
    "승인", "결제", "완료", "입금", "출금", "일시불", "타인", "원", "KRW", "건당", 
    "누적", "Web발신", "님", "확인", "잔액", "체크", "카드", "뱅크", "취소"
  ];
  
  // 날짜(12/25), 시간(22:28), 카드번호(6373), 이름가리기(김*현) 등 제거
  const noiseRegex = /(\d{1,2}:\d{1,2})|(\d{1,2}\/\d{1,2})|(\d{4})|(.\*.)/;

  const words = cleanText.split(" ");
  const titleParts = words.filter((word) => {
    const isAmount = word.includes(amountMatch[1]);
    const isExcluded = excludeKeywords.some((k) => word.includes(k));
    const isNoise = noiseRegex.test(word);
    const isSource = word.includes(paymentSource.replace("카드", "").replace("뱅크", ""));
    return !isAmount && !isExcluded && !isNoise && !isSource && word.length > 1;
  });

  const finalTitle = titleParts.join(" ").trim() || (isIncome ? "입금 내역" : "지출 내역");

  const now = new Date();
  const dateStr = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");

  return {
    title: finalTitle,
    source: paymentSource,
    amount,
    type,
    isCancellation, // 취소 여부 전달
    category: detectCategory(cleanText),
    date: dateStr,
    chapterTitle: formatChapterTitle(dateStr),
    isPaid: true,
    createdAt: now,
  };
};