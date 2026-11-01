/**
 * 푸릇한 초록 디자인 토큰 — 옅은 초록빛 바탕 + 흰 카드 + 진한 숲색 글씨, 민트·연두 포인트. 다크는 깊은 녹색.
 * 기존 코드 호환을 위해 평면 키(bg, card, text ...)를 유지한다.
 */

// 화면 비종속(공통) 토큰 — 라이트/다크 공용
const SHARED = {
  radius: {
    xs: "10px",
    sm: "14px",
    md: "18px",
    lg: "24px",
    xl: "30px",
    pill: "999px",
  },
  space: {
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    xxl: "32px",
  },
  font: {
    family:
      "'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
  },
  gradientIncome: "linear-gradient(135deg, #34C98A 0%, #179A68 100%)",
  gradientExpense: "linear-gradient(135deg, #F29A84 0%, #E5604D 100%)",
};

// 예전 설정의 기본 글자색은 "사용자가 고른 색"이 아니라서 새 숲색으로 바꿔 보여 준다(직접 고른 색은 그대로 쓴다).
const LEGACY_DEFAULT_TEXT = ["#222222", "#e5e5e5"];
const customText = (color) => (color && !LEGACY_DEFAULT_TEXT.includes(color.toLowerCase()) ? color : null);

export const getLightTheme = (customTextColor) => ({
  ...SHARED,
  isDark: false,

  // 브랜드 포인트
  primary: "#12855A",
  primaryDark: "#0E6B48",
  onPrimary: "#ffffff",
  gradientPrimary: "linear-gradient(135deg, #1FA971 0%, #0E6B48 100%)",
  heroBg: "linear-gradient(140deg, #17875F 0%, #0F5C43 100%)",

  // 배경/표면
  bg: "#F1F8F3",
  background: "#F1F8F3", // 일부 컴포넌트가 theme.background 를 참조함
  bgElevated: "#E3F2E8",
  card: "#FFFFFF",
  cardAlt: "#F4FAF6",
  surfaceHover: "#EAF5EE",

  // 텍스트
  text: customText(customTextColor) || "#16352A",
  subText: "#4A6659",
  mutedText: "#7E998C",
  border: "#E1EEE6",
  borderStrong: "#C8DFD1",

  // 포인트(연한 배경)
  primarySoft: "#DDF5E6",
  primaryText: "#0E6B48",

  // 헤더 / 탭
  headerBg: "#F1F8F3",
  headerText: "#16352A",
  headerGradient: "linear-gradient(135deg, #1FA971 0%, #0E6B48 100%)",
  navShadow: "rgba(16, 70, 48, 0.08)",

  // 상태
  activeText: "#0E6B48",
  activeBg: "#D5F2DF",
  completedBg: "#EDF7F0",
  completedBorder: "#D2E8DA",
  paidBadgeBg: "#DDF5E6",
  paidBadgeText: "#0E6B48",
  errorText: "#C8452F",

  // 금액 색상
  incomeColor: "#12855A",
  incomeSoft: "#DDF5E6",
  expenseColor: "#D9503A",
  expenseSoft: "#FCECE7",
  warning: "#C98A1B",
  warningSoft: "#FBF3D9",

  // 그래프
  chartHigh: "#17935F",
  chartLow: "#8BE3B4",
  chartDim: "#CFEBD9",
  chartFill: "rgba(31, 169, 113, 0.32)",
  chartFade: "rgba(31, 169, 113, 0.02)",

  // 그림자
  shadowSm: "0 2px 10px rgba(16, 70, 48, 0.06)",
  shadowMd: "0 8px 24px rgba(16, 70, 48, 0.09)",
  shadowLg: "0 16px 40px rgba(16, 70, 48, 0.14)",
  shadowPrimary: "0 8px 22px rgba(18, 133, 90, 0.28)",
});

export const getDarkTheme = (customTextColor) => ({
  ...SHARED,
  isDark: true,

  // 브랜드 포인트
  primary: "#3DD68C",
  primaryDark: "#22B573",
  onPrimary: "#06281A",
  gradientPrimary: "linear-gradient(135deg, #1E8F63 0%, #0F5C43 100%)",
  heroBg: "linear-gradient(140deg, #1B7A57 0%, #0E4A36 100%)",

  // 배경/표면
  bg: "#0C1A14",
  background: "#0C1A14",
  bgElevated: "#1A3026",
  card: "#13261D",
  cardAlt: "#1A3026",
  surfaceHover: "#1F382C",

  // 텍스트
  text: customText(customTextColor) || "#E6F4EC",
  subText: "#A3C2B2",
  mutedText: "#7C9C8C",
  border: "#21392D",
  borderStrong: "#2E4C3C",

  // 포인트(연한 배경)
  primarySoft: "#173D2C",
  primaryText: "#8BE8B8",

  // 헤더 / 탭
  headerBg: "#0C1A14",
  headerText: "#E6F4EC",
  headerGradient: "linear-gradient(135deg, #1E8F63 0%, #0F5C43 100%)",
  navShadow: "rgba(0, 0, 0, 0.4)",

  // 상태
  activeText: "#8BE8B8",
  activeBg: "#1D4A35",
  completedBg: "#12261C",
  completedBorder: "#23402F",
  paidBadgeBg: "#173D2C",
  paidBadgeText: "#8BE8B8",
  errorText: "#FF9C87",

  // 금액 색상
  incomeColor: "#5BE3A2",
  incomeSoft: "#173D2C",
  expenseColor: "#FF9C87",
  expenseSoft: "#33201A",
  warning: "#E9B949",
  warningSoft: "#33290F",

  // 그래프
  chartHigh: "#5BE3A2",
  chartLow: "#1E8F63",
  chartDim: "#21492F",
  chartFill: "rgba(91, 227, 162, 0.28)",
  chartFade: "rgba(91, 227, 162, 0.01)",

  // 그림자
  shadowSm: "0 2px 10px rgba(0, 0, 0, 0.35)",
  shadowMd: "0 8px 24px rgba(0, 0, 0, 0.45)",
  shadowLg: "0 16px 40px rgba(0, 0, 0, 0.55)",
  shadowPrimary: "0 8px 22px rgba(61, 214, 140, 0.25)",
});
