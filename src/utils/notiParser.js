/**
 * 상세 페이지의 제목 규칙과 동일하게 변환 (예: 2025년 12월)
 */
export const formatChapterTitle = (dateString) => {
  const d = new Date(dateString);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  return `${year}년 ${month}월`;
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

  return {
    title: description.trim(),
    source: paymentSource.trim(),
    amount: amount,
    type: 'expense',
    category: '기타',
    date: dateStr,
    chapterTitle: formatChapterTitle(dateStr), // 찾기용 타이틀 추가
    isPaid: false,
    createdAt: new Date(),
  };
};