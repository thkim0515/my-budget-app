export const formatNumber = (value) => {
  if (value === null || value === undefined) return '';
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const unformatNumber = (value) => {
  if (!value) return 0;
  return Number(value.toString().replace(/,/g, ""));
};

// export const formatCompact = (value) => {
//   if (value === null || value === undefined) return "";
//   return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(value);
// };

export const formatCompact = (value) => {
  if (value === null || value === undefined) return "";
  
  const formatted = Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 2 }).format(value);
  
  return formatted.replace("K", "k").replace("M", "m").replace("B", "b");
};
