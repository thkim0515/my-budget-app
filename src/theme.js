/**
 * 먹빛 + 하늘색 디자인 토큰 — 살짝 차가운 무채색 바탕·카드, 또렷한 글자 3단계, 파랑은 행동·수입·그래프에만 쓴다.
 * 표면은 그라데이션·그림자 대신 한 단계 밝기 차이와 1px 선으로 나눈다. 그림자는 시트처럼 떠 있는 것에만 쓴다.
 * 색은 화면 코드에 직접 쓰지 말고 여기 키를 참조한다. 금액 위 글자색은 on* 키를 쓴다.
 */

// 화면 비종속(공통) 토큰 — 라이트/다크 공용
const SHARED = {
  radius: {
    xs: "8px",
    sm: "12px",
    md: "14px",
    lg: "18px",
    xl: "18px",
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
  knob: "#FFFFFF", // 스위치 손잡이
};

// 예전 설정의 기본 글자색은 "사용자가 고른 색"이 아니라서 새 기본색으로 바꿔 보여 준다(직접 고른 색은 그대로 쓴다).
const LEGACY_DEFAULT_TEXT = ["#222222", "#e5e5e5"];
const customText = (color) => (color && !LEGACY_DEFAULT_TEXT.includes(color.toLowerCase()) ? color : null);

export const getLightTheme = (customTextColor) => ({
  ...SHARED,
  isDark: false,

  // 브랜드 포인트 — 버튼·선택 표시·수입에만
  primary: "#1668C7",
  primaryDark: "#11539F",
  onPrimary: "#FFFFFF",
  onExpense: "#FFFFFF",
  neutralBtn: "#5C646E",
  onNeutralBtn: "#FFFFFF",

  // 대표 금액 카드 — 라이트에서도 먹색 한 장으로 숫자를 띄운다
  heroBg: "#171C22",
  heroText: "#FFFFFF",
  heroSub: "#BAC2CC",
  heroChip: "#2A3138",
  heroTrack: "#38404A",
  heroFill: "#6CB8FF",
  heroNegative: "#F4A898",

  // 배경/표면
  bg: "#F4F6F8",
  background: "#F4F6F8", // 일부 컴포넌트가 theme.background 를 참조함
  bgElevated: "#EAEDF1",
  card: "#FFFFFF",
  cardAlt: "#F6F8FA",
  surfaceHover: "#ECEFF3",
  segmentActive: "#FFFFFF",

  // 텍스트
  text: customText(customTextColor) || "#15191E",
  subText: "#4E5660",
  mutedText: "#656D77",
  border: "#E2E6EB",
  borderStrong: "#CAD0D8",

  // 포인트(연한 배경)
  primarySoft: "#E3EEFB",
  primaryText: "#11539F",

  // 헤더 / 탭
  headerBg: "#F4F6F8",
  headerText: "#15191E",

  // 상태
  activeText: "#11539F",
  activeBg: "#E4E9EF",
  completedBg: "#EFF2F5",
  completedBorder: "#E2E6EB",
  paidBadgeBg: "#E3EEFB",
  paidBadgeText: "#11539F",
  errorText: "#B23E28",

  // 금액 색상
  incomeColor: "#1668C7",
  incomeSoft: "#E3EEFB",
  expenseColor: "#BF4530",
  expenseSoft: "#F9ECE8",
  warning: "#8F6208",
  warningSoft: "#F6EFDC",
  infoColor: "#2B6CB0",

  // 그래프 — 주 데이터 한 색, 나머지는 회색
  chartHigh: "#1668C7",
  chartDim: "#D2D8DF",
  chartFill: "rgba(22, 104, 199, 0.10)",
  tooltipBg: "#171C22",
  tooltipText: "#FFFFFF",
  categoryColors: { 식비: "#2F76C4", 편의점: "#B98A1E", 배달: "#D3703F", 쇼핑: "#8C5FB8", 교통: "#1B93B8", 생활: "#C65A8C", 구독: "#6560C8", 의료: "#C94F4F" },
  chartPalette: ["#2F76C4", "#1B93B8", "#B98A1E", "#D3703F", "#8C5FB8", "#C65A8C", "#6560C8", "#C94F4F", "#3F9AA8", "#7F8A96"],

  // 그림자 — 떠 있는 요소 전용
  shadowSm: "none",
  shadowMd: "none",
  shadowLg: "0 12px 32px rgba(0, 0, 0, 0.16)",
  shadowPrimary: "none",
  overlay: "rgba(0, 0, 0, 0.5)",
});

export const getDarkTheme = (customTextColor) => ({
  ...SHARED,
  isDark: true,

  // 브랜드 포인트 — 버튼·선택 표시·수입에만
  primary: "#6CB8FF",
  primaryDark: "#4FA3F0",
  onPrimary: "#06213A",
  onExpense: "#2A120C",
  neutralBtn: "#38404A",
  onNeutralBtn: "#F0F3F6",

  // 대표 금액 카드 — 카드보다 한 단계 밝은 면
  heroBg: "#222830",
  heroText: "#FFFFFF",
  heroSub: "#B8C0CA",
  heroChip: "#2F3741",
  heroTrack: "#38414C",
  heroFill: "#6CB8FF",
  heroNegative: "#F4A898",

  // 배경/표면
  bg: "#0F1215",
  background: "#0F1215",
  bgElevated: "#22272C",
  card: "#181C20",
  cardAlt: "#1F2429",
  surfaceHover: "#282D33",
  segmentActive: "#38404A",

  // 텍스트
  text: customText(customTextColor) || "#F0F3F6",
  subText: "#B2BAC2",
  mutedText: "#929AA3",
  border: "#282D33",
  borderStrong: "#40474F",

  // 포인트(연한 배경)
  primarySoft: "#16283A",
  primaryText: "#9CD0FF",

  // 헤더 / 탭
  headerBg: "#0F1215",
  headerText: "#F0F3F6",

  // 상태
  activeText: "#9CD0FF",
  activeBg: "#232B33",
  completedBg: "#14171A",
  completedBorder: "#22272C",
  paidBadgeBg: "#16283A",
  paidBadgeText: "#9CD0FF",
  errorText: "#F4A898",

  // 금액 색상
  incomeColor: "#6CB8FF",
  incomeSoft: "#16283A",
  expenseColor: "#F4A898",
  expenseSoft: "#33221E",
  warning: "#E3BC63",
  warningSoft: "#2E2817",
  infoColor: "#8DBBEA",

  // 그래프 — 주 데이터 한 색, 나머지는 회색
  chartHigh: "#6CB8FF",
  chartDim: "#343A41",
  chartFill: "rgba(108, 184, 255, 0.14)",
  tooltipBg: "#343A42",
  tooltipText: "#FFFFFF",
  categoryColors: { 식비: "#6CB8FF", 편의점: "#E3BC63", 배달: "#EE9F7B", 쇼핑: "#C6A3E0", 교통: "#6FD3E8", 생활: "#E79BBB", 구독: "#A7A5EC", 의료: "#EE8D8D" },
  chartPalette: ["#6CB8FF", "#6FD3E8", "#E3BC63", "#EE9F7B", "#C6A3E0", "#E79BBB", "#A7A5EC", "#EE8D8D", "#7CCBD6", "#A3ABB5"],

  // 그림자 — 떠 있는 요소 전용
  shadowSm: "none",
  shadowMd: "none",
  shadowLg: "0 12px 32px rgba(0, 0, 0, 0.5)",
  shadowPrimary: "none",
  overlay: "rgba(0, 0, 0, 0.6)",
});
