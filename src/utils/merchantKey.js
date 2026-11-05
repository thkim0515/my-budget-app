// 비교용 가맹점 이름 — 공백·기호·법인 표기·지점명을 뺀다.
export const normalizeMerchant = (name) => {
  const words = (name || "").toLowerCase().replace(/\(주\)|㈜|주식회사/g, " ").replace(/[()[\]\-_.,·*/]/g, " ").trim().split(/\s+/);
  if (words.length > 1 && /(점|지점|호점|센터)$/.test(words[words.length - 1])) words.pop();
  return words.join("").replace(/^([a-z0-9]+)[가-힣]+(점|지점)$/, "$1");
};
