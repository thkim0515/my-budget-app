import styled from "styled-components";
import { BOTTOM_NAV_HEIGHT } from "../../constants/ui";

export const Page = styled.div`
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  color: ${({ theme }) => theme.text};
`;

export const Body = styled.div`
  padding: 12px 16px calc(${28 + BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

export const AddBtn = styled.button`
  min-height: 40px;
  padding: 0 14px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.primary};
  color: ${({ theme }) => theme.onPrimary};
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  &:active { transform: scale(0.97); }
`;

export const Segment = styled.div`
  display: flex;
  gap: 4px;
  padding: 4px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.bgElevated};
`;

export const SegmentBtn = styled.button`
  flex: 1;
  min-height: 38px;
  padding: 0 4px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.xs};
  background: ${({ $active, theme }) => ($active ? theme.card : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.text : theme.subText)};
  box-shadow: ${({ $active, theme }) => ($active ? theme.shadowSm : "none")};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  cursor: pointer;
`;

export const Card = styled.section`
  padding: 16px;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  box-shadow: ${({ theme }) => theme.shadowSm};
  min-width: 0;
`;

export const CardTitle = styled.h2`
  margin: 0 0 10px;
  font-size: 15px;
  font-weight: 700;
`;

export const Caption = styled.div`
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.subText};
`;

export const HeroLabel = styled.div`
  font-size: 13px;
  color: ${({ theme }) => theme.subText};
`;

export const HeroValue = styled.div`
  margin: 2px 0 6px;
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  color: ${({ $negative, theme }) => ($negative ? theme.expenseColor : theme.text)};
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
`;

export const Stats = styled.div`
  display: grid;
  grid-template-columns: repeat(${({ $cols }) => $cols || 2}, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
`;

export const Stat = styled.div`
  min-width: 0;
  & > div:first-child { font-size: 12px; color: ${({ theme }) => theme.subText}; }
  & > div:last-child {
    margin-top: 2px;
    font-size: 15px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
    color: ${({ $color, theme }) => ($color ? theme[$color] : theme.text)};
  }
`;

export const Meter = styled.div`
  height: 8px;
  margin-top: 12px;
  border-radius: 4px;
  overflow: hidden;
  background: ${({ theme }) => theme.bgElevated};
  & > div {
    height: 100%;
    border-radius: 4px;
    width: ${({ $pct }) => Math.min(Math.max($pct, 0), 100)}%;
    background: ${({ $danger, theme }) => ($danger ? theme.expenseColor : theme.primary)};
  }
`;

export const MonthNav = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  & > strong { font-size: 15px; }
`;

export const IconBtn = styled.button`
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: ${({ theme }) => theme.text};
  font-size: 20px;
  cursor: pointer;
  &:active { background: ${({ theme }) => theme.activeBg}; }
  &:disabled { opacity: 0.25; cursor: default; }
`;

export const ChartBox = styled.div`
  position: relative;
  height: ${({ $h }) => $h || 180}px;
`;

export const Legend = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin-bottom: 8px;
  font-size: 12px;
  color: ${({ theme }) => theme.subText};
`;

export const LegendKey = styled.span`
  display: inline-block;
  width: 16px;
  margin-right: 5px;
  vertical-align: middle;
  border-top: 2px ${({ $dashed }) => ($dashed ? "dashed" : "solid")} ${({ $color }) => $color};
`;

export const Detail = styled.div`
  margin-top: 12px;
  padding: 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.cardAlt};
`;

export const Delta = styled.span`
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ $up, theme }) => ($up ? theme.expenseColor : theme.incomeColor)};
`;

export const TxBtn = styled.button`
  width: 100%;
  min-height: 52px;
  padding: 8px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  border: none;
  border-top: 1px solid ${({ theme }) => theme.border};
  background: transparent;
  color: ${({ theme }) => theme.text};
  text-align: left;
  cursor: pointer;
  &:first-child { border-top: none; }
  & strong { display: block; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
  & small { font-size: 12px; color: ${({ theme }) => theme.subText}; }
  & > span:last-child { flex-shrink: 0; font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
`;

export const RankRow = styled.div`
  padding: 7px 0;
  & > div:first-child { display: flex; justify-content: space-between; gap: 10px; font-size: 13.5px; }
  & span:first-child { overflow-wrap: anywhere; }
  & span:last-child { flex-shrink: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
`;

export const Bar = styled.div`
  height: 6px;
  margin-top: 5px;
  border-radius: 3px;
  width: ${({ $pct }) => Math.max($pct, 1)}%;
  background: ${({ $color }) => $color};
`;

export const Dot = styled.span`
  display: inline-block;
  width: 10px;
  height: 10px;
  margin-right: 7px;
  border-radius: 3px;
  background: ${({ $color }) => $color};
`;

export const Field = styled.label`
  display: block;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
  color: ${({ theme }) => theme.subText};
  & input, & select {
    display: block;
    width: 100%;
    min-height: 46px;
    margin-top: 5px;
    padding: 0 12px;
    box-sizing: border-box;
    border: 1px solid ${({ theme }) => theme.borderStrong};
    border-radius: ${({ theme }) => theme.radius.sm};
    background: ${({ theme }) => theme.card};
    color: ${({ theme }) => theme.text};
    font-size: 16px;
    font-weight: 500;
  }
`;

export const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  font-size: 14px;
  & input { width: 20px; height: 20px; flex-shrink: 0; }
`;

export const PrimaryBtn = styled.button`
  width: 100%;
  min-height: 48px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.primary};
  color: ${({ theme }) => theme.onPrimary};
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  &:disabled { opacity: 0.45; cursor: default; }
`;

export const GhostBtn = styled.button`
  width: 100%;
  min-height: 44px;
  margin-top: 8px;
  border: 1px solid ${({ theme }) => theme.borderStrong};
  border-radius: ${({ theme }) => theme.radius.sm};
  background: transparent;
  color: ${({ $danger, theme }) => ($danger ? theme.errorText : theme.text)};
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
`;

export const Divider = styled.hr`
  margin: 16px 0;
  border: none;
  border-top: 1px solid ${({ theme }) => theme.border};
`;

export const Bullets = styled.ul`
  margin: 0;
  padding-left: 18px;
  font-size: 14px;
  line-height: 1.6;
  & li + li { margin-top: 4px; }
`;

export const Pre = styled.pre`
  margin: 8px 0 0;
  padding: 10px;
  max-height: 240px;
  overflow: auto;
  border-radius: ${({ theme }) => theme.radius.xs};
  background: ${({ theme }) => theme.cardAlt};
  font-size: 11.5px;
  white-space: pre-wrap;
  word-break: break-all;
`;
