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
  { category: "편의점", keywords: ["GS25", "CU", "세븐일레븐", "미니스톱"] },
  { category: "구독", keywords: ["넷플릭스", "Netflix", "Spotify", "유튜브"] },
  { category: "배달", keywords: ["배민", "요기요", "쿠팡이츠"] },
  { category: "쇼핑", keywords: ["쿠팡", "마켓컬리", "11번가"] },
  { category: "교통", keywords: ["택시", "카카오T", "지하철", "버스"] },
];

const detectCategory = (text) => {
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some(keyword => text.includes(keyword))) {
      return rule.category;
    }
  }
  return "기타";
};


export const parseAndCreateRecord = (text) => {
  const dateRegex = /(\d{1,2}\/\d{1,2}\s+\d{1,2}:\d{1,2})|(\d{4}-\d{2}-\d{2})/;
  const dateMatch = text.match(dateRegex);
  let recordDate = new Date();

  if (dateMatch) {
    const rawDate = dateMatch[0];
    recordDate = rawDate.includes('/') 
      ? new Date(`${new Date().getFullYear()}/${rawDate}`) 
      : new Date(rawDate);
  }

  const infoRegex = /([가-힣\w]+)\s+([가-힣\w\s]+?)\s+([\d,]+)\s*원/;
  const infoMatch = text.match(infoRegex);

  if (!infoMatch) return null;

  const [, paymentSource, description, amountStr] = infoMatch;
  const amount = parseInt(amountStr.replace(/,/g, ''), 10);
  const dateStr = recordDate.toISOString().split('T')[0];

  const cleanTitle = description
  .replace(/(삼성|신한|현대|국민|KB|롯데|하나|우리)\s*카드/g, "")
  .trim();

  const autoCategory = detectCategory(text);

    return {
    title: cleanTitle,
    source: paymentSource.trim(),
    amount,
    type: 'expense',
    category: autoCategory,
    date: dateStr,
    chapterTitle: formatChapterTitle(dateStr),
    isPaid: false,
    createdAt: new Date(),
    };

};