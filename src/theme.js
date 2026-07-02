/**
 * 모던 핀테크 디자인 토큰 시스템
 * - 기존 코드 호환을 위해 평면 키(bg, card, text ...)를 유지하면서
 *   새로운 핀테크 토큰(primary, gradients, radius, shadow, space ...)을 추가한다.
 */

// 화면 비종속(공통) 토큰 — 라이트/다크 공용
const SHARED = {
  radius: {
    xs: "8px",
    sm: "12px",
    md: "16px",
    lg: "20px",
    xl: "28px",
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
  // 브랜드 포인트 컬러 (라이트/다크 공용)
  primary: "#4C6FFF",
  primaryDark: "#3651D4",
  onPrimary: "#ffffff",
  gradientPrimary: "linear-gradient(135deg, #5B7CFF 0%, #6F5BFF 100%)",
  gradientIncome: "linear-gradient(135deg, #2BD67B 0%, #12B76A 100%)",
  gradientExpense: "linear-gradient(135deg, #FF7A8A 0%, #F5455C 100%)",
};

export const getLightTheme = (customTextColor) => ({
  ...SHARED,
  isDark: false,

  // 배경/표면
  bg: "#F4F6FB",
  background: "#F4F6FB", // 일부 컴포넌트가 theme.background 를 참조함
  bgElevated: "#EEF1F8",
  card: "#FFFFFF",
  cardAlt: "#F7F9FC",
  surfaceHover: "#F0F3F9",

  // 텍스트
  text: customTextColor || "#15171C",
  subText: "#5A6072",
  mutedText: "#9098A8",
  border: "#EAEDF3",
  borderStrong: "#D8DDE7",

  // 포인트(연한 배경)
  primarySoft: "#ECF0FF",
  primaryText: "#3651D4",

  // 헤더 / 탭
  headerBg: "#FFFFFF",
  headerText: "#15171C",
  headerGradient: "linear-gradient(135deg, #5B7CFF 0%, #6F5BFF 100%)",

  // 상태
  activeText: "#4C6FFF",
  activeBg: "#ECF0FF",
  completedBg: "#F1F8F4",
  completedBorder: "#D8EBDF",
  paidBadgeBg: "#E6F7EF",
  paidBadgeText: "#0F9D58",
  errorText: "#E03E52",

  // 금액 색상
  incomeColor: "#12B76A",
  incomeSoft: "#E7F8EF",
  expenseColor: "#F5455C",
  expenseSoft: "#FDEBEE",
  warning: "#F59E0B",
  warningSoft: "#FEF3DC",

  // 그림자
  shadowSm: "0 1px 3px rgba(20, 30, 60, 0.06)",
  shadowMd: "0 6px 18px rgba(20, 30, 60, 0.08)",
  shadowLg: "0 14px 40px rgba(20, 30, 60, 0.12)",
  shadowPrimary: "0 8px 24px rgba(76, 111, 255, 0.32)",
});

export const getDarkTheme = (customTextColor) => ({
  ...SHARED,
  isDark: true,

  // 배경/표면
  bg: "#0E1014",
  background: "#0E1014",
  bgElevated: "#15181F",
  card: "#1A1D25",
  cardAlt: "#21252F",
  surfaceHover: "#242935",

  // 텍스트
  text: customTextColor || "#ECEFF5",
  subText: "#A2AAB8",
  mutedText: "#737B8C",
  border: "#272B35",
  borderStrong: "#343A47",

  // 포인트(연한 배경)
  primarySoft: "#1E2540",
  primaryText: "#9DB0FF",

  // 헤더 / 탭
  headerBg: "#15181F",
  headerText: "#ECEFF5",
  headerGradient: "linear-gradient(135deg, #4256C8 0%, #5B49CC 100%)",

  // 상태
  activeText: "#9DB0FF",
  activeBg: "#1E2540",
  completedBg: "#14201A",
  completedBorder: "#23382C",
  paidBadgeBg: "#123A2A",
  paidBadgeText: "#4ADE9A",
  errorText: "#FF8A98",

  // 금액 색상
  incomeColor: "#3DDC84",
  incomeSoft: "#13271D",
  expenseColor: "#FF6B7C",
  expenseSoft: "#2A1820",
  warning: "#FBBF24",
  warningSoft: "#2E2410",

  // 그림자
  shadowSm: "0 1px 3px rgba(0, 0, 0, 0.4)",
  shadowMd: "0 6px 18px rgba(0, 0, 0, 0.45)",
  shadowLg: "0 14px 40px rgba(0, 0, 0, 0.55)",
  shadowPrimary: "0 8px 24px rgba(76, 111, 255, 0.4)",
});
