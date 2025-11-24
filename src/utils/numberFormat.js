export const formatNumber = (value) => {
  if (value === null || value === undefined) return '';
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

export const unformatNumber = (value) => {
  if (!value) return 0;
  return Number(value.toString().replace(/,/g, ""));
};
