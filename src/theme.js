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
  completedBg: "#161d1a", // 카드는 아주 어두운 녹색톤이 도는 검정
  completedBorder: "#203a2f",

  // [수정] 다크 모드: 깊고 어두운 숲색 배경 + 부드러운 텍스트 (Dark Feel)
  paidBadgeBg: "#064e3b",
  paidBadgeText: "#6ee7b7",
});