export const getLightTheme = (customTextColor) => ({
  bg: "#f8f9fa",
  text: customTextColor || "#222",
  card: "#ffffff",
  headerBg: "#1976d2",
  headerText: "#ffffff",
  border: "#ddd",
  activeText: "#1976d2",
  activeBg: "#e3f2fd",
  completedBg: "#f1f8f5",
  completedBorder: "#d1e7dd",
  paidBadgeBg: "#e7faf3",
  paidBadgeText: "#059669",
});

export const getDarkTheme = (customTextColor) => ({
  bg: "#121212",
  text: customTextColor || "#e5e5e5",
  card: "#1e1e1e",
  headerBg: "#333",
  headerText: "#fff",
  border: "#444",
  activeText: "#ffffff",
  activeBg: "#333",
  completedBg: "#161d1a",
  completedBorder: "#203a2f",

  // [수정] 다크 모드: 시인성이 확보된 선명한 초록색 배경 + 완전한 흰색 텍스트
  paidBadgeBg: "#10b981",
  paidBadgeText: "#ffffff",
});
