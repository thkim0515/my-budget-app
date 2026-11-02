/**
 * 먹빛 + 새순 디자인 토큰 — 무채색에 가까운 바탕·카드, 또렷한 글자 3단계, 초록은 행동·수입·그래프에만 쓴다.
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
  primary: "#1E7A55",
  primaryDark: "#17633F",
  onPrimary: "#FFFFFF",
  onExpense: "#FFFFFF",
  neutralBtn: "#5F6662",
  onNeutralBtn: "#FFFFFF",

  // 대표 금액 카드 — 라이트에서도 먹색 한 장으로 숫자를 띄운다
  heroBg: "#1A1E1C",
  heroText: "#FFFFFF",
  heroSub: "#BCC3BE",
  heroChip: "#2C312E",
  heroTrack: "#3A403C",
  heroFill: "#8FD9AE",
  heroNegative: "#F4A898",

  // 배경/표면
  bg: "#F5F6F4",
  background: "#F5F6F4", // 일부 컴포넌트가 theme.background 를 참조함
  bgElevated: "#ECEEEB",
  card: "#FFFFFF",
  cardAlt: "#F7F8F6",
  surfaceHover: "#EDEFEC",
  segmentActive: "#FFFFFF",

  // 텍스트
  text: customText(customTextColor) || "#171A18",
  subText: "#505753",
  mutedText: "#676E6A",
  border: "#E4E7E3",
  borderStrong: "#CDD2CD",

  // 포인트(연한 배경)
  primarySoft: "#E4F2EA",
  primaryText: "#17633F",

  // 헤더 / 탭
  headerBg: "#F5F6F4",
  headerText: "#171A18",

  // 상태
  activeText: "#17633F",
  activeBg: "#E6E9E5",
  completedBg: "#F1F2F0",
  completedBorder: "#E4E7E3",
  paidBadgeBg: "#E4F2EA",
  paidBadgeText: "#17633F",
  errorText: "#B23E28",

  // 금액 색상
  incomeColor: "#1E7A55",
  incomeSoft: "#E4F2EA",
  expenseColor: "#BF4530",
  expenseSoft: "#F9ECE8",
  warning: "#8F6208",
  warningSoft: "#F6EFDC",
  infoColor: "#2B6CB0",

  // 그래프 — 주 데이터 한 색, 나머지는 회색
  chartHigh: "#1E7A55",
  chartDim: "#D5DAD5",
  chartFill: "rgba(30, 122, 85, 0.10)",
  tooltipBg: "#1A1E1C",
  tooltipText: "#FFFFFF",
  categoryColors: { 식비: "#2C9A6C", 편의점: "#B98A1E", 배달: "#D3703F", 쇼핑: "#8C5FB8", 교통: "#2F76C4", 생활: "#C65A8C", 구독: "#6560C8", 의료: "#C94F4F" },
  chartPalette: ["#2C9A6C", "#2F76C4", "#B98A1E", "#D3703F", "#8C5FB8", "#C65A8C", "#6560C8", "#C94F4F", "#3F9AA8", "#7E8A84"],

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
  primary: "#8FD9AE",
  primaryDark: "#74C795",
  onPrimary: "#0E2419",
  onExpense: "#2A120C",
  neutralBtn: "#3A3F3C",
  onNeutralBtn: "#F1F3F1",

  // 대표 금액 카드 — 카드보다 한 단계 밝은 면
  heroBg: "#232725",
  heroText: "#FFFFFF",
  heroSub: "#B9BFBB",
  heroChip: "#323734",
  heroTrack: "#3B403D",
  heroFill: "#8FD9AE",
  heroNegative: "#F4A898",

  // 배경/표면
  bg: "#111312",
  background: "#111312",
  bgElevated: "#242725",
  card: "#1A1C1B",
  cardAlt: "#212422",
  surfaceHover: "#2A2D2B",
  segmentActive: "#3A3F3C",

  // 텍스트
  text: customText(customTextColor) || "#F1F3F1",
  subText: "#B4BAB6",
  mutedText: "#949A96",
  border: "#2A2D2B",
  borderStrong: "#434845",

  // 포인트(연한 배경)
  primarySoft: "#1F2C25",
  primaryText: "#A6E3C0",

  // 헤더 / 탭
  headerBg: "#111312",
  headerText: "#F1F3F1",

  // 상태
  activeText: "#A6E3C0",
  activeBg: "#2C302D",
  completedBg: "#161817",
  completedBorder: "#242725",
  paidBadgeBg: "#1F2C25",
  paidBadgeText: "#A6E3C0",
  errorText: "#F4A898",

  // 금액 색상
  incomeColor: "#8FD9AE",
  incomeSoft: "#1F2C25",
  expenseColor: "#F4A898",
  expenseSoft: "#33221E",
  warning: "#E3BC63",
  warningSoft: "#2E2817",
  infoColor: "#8DBBEA",

  // 그래프 — 주 데이터 한 색, 나머지는 회색
  chartHigh: "#8FD9AE",
  chartDim: "#373B38",
  chartFill: "rgba(143, 217, 174, 0.12)",
  tooltipBg: "#363A37",
  tooltipText: "#FFFFFF",
  categoryColors: { 식비: "#8FD9AE", 편의점: "#E3BC63", 배달: "#EE9F7B", 쇼핑: "#C6A3E0", 교통: "#7FB4E8", 생활: "#E79BBB", 구독: "#A7A5EC", 의료: "#EE8D8D" },
  chartPalette: ["#8FD9AE", "#7FB4E8", "#E3BC63", "#EE9F7B", "#C6A3E0", "#E79BBB", "#A7A5EC", "#EE8D8D", "#7CCBD6", "#A3ABA6"],

  // 그림자 — 떠 있는 요소 전용
  shadowSm: "none",
  shadowMd: "none",
  shadowLg: "0 12px 32px rgba(0, 0, 0, 0.5)",
  shadowPrimary: "none",
  overlay: "rgba(0, 0, 0, 0.6)",
});
