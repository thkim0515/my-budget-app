import { useRef } from "react";
import { useTheme } from "styled-components";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip } from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { formatNumber } from "../../utils/numberFormat";
import { ChartBox } from "./KakaoPage.styles";

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Tooltip);

// 카테고리 색은 순위가 아니라 카테고리에 고정한다(달이 바뀌어도 색이 안 바뀌게). 나머지는 회색으로 묶인다.
const CATEGORY_COLORS = {
  light: { 식비: "#2a78d6", 편의점: "#eb6834", 배달: "#1baf7a", 쇼핑: "#eda100", 교통: "#e87ba4", 생활: "#008300", 구독: "#6250d6", 의료: "#e34948" },
  dark: { 식비: "#3987e5", 편의점: "#d95926", 배달: "#199e70", 쇼핑: "#c98500", 교통: "#d55181", 생활: "#008300", 구독: "#9085e9", 의료: "#e66767" },
};
export const categoryColor = (name, theme) => CATEGORY_COLORS[theme.isDark ? "dark" : "light"][name] || theme.mutedText;

export const won = (n) => `${formatNumber(Math.round(n))}원`;
const tickWon = (v) => {
  const abs = Math.abs(v);
  if (abs >= 10000) return `${Math.round((v / 10000) * 10) / 10}만`;
  return String(v);
};

// 누른 위치의 x 축 항목을 고른다. Chart.js 의 onClick 은 다음 프레임으로 미뤄지므로 캔버스 클릭에서 바로 찾는다.
const useChartSelect = (onSelect) => {
  const ref = useRef(null);
  const onClick = (event) => {
    const chart = ref.current;
    if (!chart || !onSelect) return;
    const hit = chart.getElementsAtEventForMode(event.nativeEvent, "index", { intersect: false, axis: "x" }, true);
    if (hit.length) onSelect(hit[0].index);
  };
  return { ref, onClick };
};

const baseOptions = (theme) => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 250 },
  // 막대·점보다 넓은 범위를 눌러도 그 날짜가 잡히게 x 축 기준으로 찾는다.
  interaction: { mode: "index", intersect: false, axis: "x" },
  scales: {
    x: {
      grid: { display: false },
      border: { color: theme.borderStrong },
      ticks: { color: theme.subText, font: { size: 11 }, maxRotation: 0, autoSkipPadding: 10 },
    },
    y: {
      grid: { color: theme.border },
      border: { display: false },
      ticks: { color: theme.subText, font: { size: 11 }, maxTicksLimit: 5, callback: tickWon },
    },
  },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: theme.isDark ? "#2B303B" : "#15171C",
      titleColor: "#FFFFFF",
      bodyColor: "#FFFFFF",
      displayColors: false,
      callbacks: { label: (c) => (c.parsed.y == null ? "" : `${c.dataset.label}: ${won(c.parsed.y)}`) },
    },
  },
});

export function SpendBars({ rows, selected, onSelect, height = 180 }) {
  const theme = useTheme();
  const select = useChartSelect(onSelect);
  const data = {
    labels: rows.map((r) => r.label),
    datasets: [{
      label: "결제",
      data: rows.map((r) => Math.max(r.spend, 0)),
      backgroundColor: rows.map((_, i) => (selected == null || i === selected ? theme.primary : theme.isDark ? "#39477F" : "#BCC9FF")),
      borderRadius: { topLeft: 4, topRight: 4 },
      borderSkipped: "bottom",
      maxBarThickness: 24,
      categoryPercentage: 0.8,
      barPercentage: 0.9,
    }],
  };
  const options = baseOptions(theme);
  options.scales.y.beginAtZero = true;
  return <ChartBox $h={height}><Bar {...select} data={data} options={options} /></ChartBox>;
}

export function CumulativeLines({ rows, selected, onSelect, thisLabel, prevLabel }) {
  const theme = useTheme();
  const select = useChartSelect(onSelect);
  const data = {
    labels: rows.map((r) => r.label),
    datasets: [
      {
        label: thisLabel,
        data: rows.map((r) => r.cum),
        borderColor: theme.primary,
        backgroundColor: theme.primary,
        borderWidth: 2,
        tension: 0.2,
        pointRadius: rows.map((_, i) => (i === selected ? 5 : 0)),
        pointHoverRadius: 5,
      },
      {
        label: prevLabel,
        data: rows.map((r) => r.prevCum),
        borderColor: theme.mutedText,
        backgroundColor: theme.mutedText,
        borderWidth: 2,
        borderDash: [5, 4],
        tension: 0.2,
        pointRadius: 0,
        pointHoverRadius: 4,
      },
    ],
  };
  const options = baseOptions(theme);
  options.scales.y.beginAtZero = true;
  return <ChartBox $h={170}><Line {...select} data={data} options={options} /></ChartBox>;
}

// 순자금 추이. 0 선과 마이너스 한도 선을 같은 축에 함께 그린다.
export function NetLine({ rows, limit, selected, onSelect }) {
  const theme = useTheme();
  const select = useChartSelect(onSelect);
  const datasets = [
    {
      label: "순자금",
      data: rows.map((r) => r.net),
      borderColor: theme.primary,
      backgroundColor: theme.primary,
      borderWidth: 2,
      tension: 0.15,
      pointRadius: rows.map((_, i) => (i === selected ? 5 : 0)),
      pointHoverRadius: 5,
    },
    { label: "0원", data: rows.map(() => 0), borderColor: theme.borderStrong, borderWidth: 1, pointRadius: 0, pointHoverRadius: 0 },
  ];
  if (limit > 0) {
    datasets.push({ label: "마이너스 한도", data: rows.map(() => -limit), borderColor: theme.expenseColor, borderWidth: 2, borderDash: [5, 4], pointRadius: 0, pointHoverRadius: 0 });
  }
  const options = baseOptions(theme);
  options.plugins.tooltip.filter = (item) => item.datasetIndex === 0;
  return <ChartBox $h={200}><Line {...select} data={{ labels: rows.map((r) => r.label), datasets }} options={options} /></ChartBox>;
}

export function CategoryDoughnut({ rows }) {
  const theme = useTheme();
  const data = {
    labels: rows.map((r) => r.name),
    datasets: [{
      data: rows.map((r) => r.amount),
      backgroundColor: rows.map((r) => categoryColor(r.name, theme)),
      borderColor: theme.card,
      borderWidth: 2,
    }],
  };
  const total = rows.reduce((acc, r) => acc + r.amount, 0);
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "62%",
    plugins: {
      legend: { display: false },
      tooltip: { callbacks: { label: (c) => `${won(c.parsed)} (${Math.round((c.parsed / total) * 100)}%)` } },
    },
  };
  return <ChartBox $h={180}><Doughnut data={data} options={options} /></ChartBox>;
}
