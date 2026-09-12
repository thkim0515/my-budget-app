/* src/utils/cardLimit.js */

/** 현재 로컬 기준 "YYYY-MM" 문자열 */
export const getCurrentYm = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * 이번 달(현재 로컬 기준) 특정 카드사(source)의 지출 합계를 계산한다.
 * 계산에서 제외 처리된 항목은 제외한다.
 */
export const computeCardUsage = (records, provider) => {
  if (!provider) return 0;
  const ym = getCurrentYm();

  return records
    .filter((r) => {
      if (r.type !== "expense" || r.excludedFromCalc) return false;
      if (r.source !== provider) return false;
      const dateStr = String(r.date || r.createdAt || "");
      return dateStr.slice(0, 7) === ym;
    })
    .reduce((sum, r) => sum + r.amount, 0);
};

/**
 * 한도 대비 사용률(0~1)에 따라 초록(여유) → 빨강(한도 임박) 색을 보간한다.
 */
export const getLimitColor = (usageRatio) => {
  const ratio = Math.min(1, Math.max(0, usageRatio));
  const hue = 120 - 120 * ratio; // 120=초록, 0=빨강
  return `hsl(${hue}, 72%, 45%)`;
};
