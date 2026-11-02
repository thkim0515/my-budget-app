import styled from "styled-components";
import { BOTTOM_NAV_HEIGHT } from "../../constants/ui";

export const Page = styled.div`
  max-width: 480px;
  margin: 0 auto;
  min-height: 100vh;
  color: ${({ theme }) => theme.text};
`;

export const Body = styled.div`
  padding: 4px 16px calc(${32 + BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 16px;
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
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.bgElevated};
`;

export const SegmentBtn = styled.button`
  flex: 1;
  min-height: 40px;
  padding: 0 4px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $active, theme }) => ($active ? theme.segmentActive : "transparent")};
  color: ${({ $active, theme }) => ($active ? theme.text : theme.subText)};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  cursor: pointer;
`;

export const Card = styled.section`
  padding: 20px;
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.card};
  border: 1px solid ${({ theme }) => theme.border};
  min-width: 0;
`;

// 탭마다 맨 위 한 장 — 가장 궁금한 금액을 다른 카드보다 도드라진 면에 크게 보여 준다.
export const Hero = styled.section`
  padding: 24px 22px;
  border-radius: ${({ theme }) => theme.radius.xl};
  background: ${({ theme }) => theme.heroBg};
  color: ${({ theme }) => theme.heroText};
  min-width: 0;
`;

export const HeroNote = styled.div`
  display: inline-block;
  margin-top: 4px;
  padding: 5px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.heroChip};
  color: ${({ theme }) => theme.heroText};
  font-size: 13px;
  font-weight: 600;
`;

export const CardTitle = styled.h2`
  margin: 0 0 12px;
  font-size: 16px;
  font-weight: 600;
`;

export const Caption = styled.div`
  font-size: 12.5px;
  line-height: 1.5;
  color: ${({ theme }) => theme.subText};
`;

export const HeroLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${({ $onHero, theme }) => ($onHero ? theme.heroSub : theme.subText)};
`;

export const HeroValue = styled.div`
  margin: 4px 0 8px;
  font-size: 36px;
  line-height: 1.15;
  font-weight: 700;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
  color: ${({ $negative, $onHero, theme }) => ($onHero ? ($negative ? theme.heroNegative : theme.heroText) : $negative ? theme.expenseColor : theme.text)};
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
  & > div:first-child { font-size: 12.5px; color: ${({ $onHero, theme }) => ($onHero ? theme.heroSub : theme.subText)}; }
  & > div:last-child {
    margin-top: 2px;
    font-size: 15px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    overflow-wrap: anywhere;
    color: ${({ $color, $onHero, theme }) => ($onHero ? theme.heroText : $color ? theme[$color] : theme.text)};
  }
`;

export const Meter = styled.div`
  height: 8px;
  margin-top: 14px;
  border-radius: 4px;
  overflow: hidden;
  background: ${({ $onHero, theme }) => ($onHero ? theme.heroTrack : theme.bgElevated)};
  & > div {
    height: 100%;
    border-radius: 4px;
    width: ${({ $pct }) => Math.min(Math.max($pct, 0), 100)}%;
    background: ${({ $danger, $onHero, theme }) => ($onHero ? ($danger ? theme.heroNegative : theme.heroFill) : $danger ? theme.expenseColor : theme.primary)};
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
  &:active { opacity: 0.7; }
  & strong { display: block; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
  & small { font-size: 12px; color: ${({ theme }) => theme.subText}; }
  & > span:last-child { flex-shrink: 0; font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }
`;

export const RankRow = styled.div`
  padding: 7px 0;
  & > div:first-child { display: flex; justify-content: space-between; gap: 10px; font-size: 13.5px; }
  & span:first-child { overflow-wrap: anywhere; }
  & span:last-child { flex-shrink: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
`;

export const SourceRow = styled.button`
  display: block;
  width: 100%;
  min-height: 52px;
  margin-bottom: 4px;
  padding: 8px 10px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.xs};
  background: ${({ $active, theme }) => ($active ? theme.activeBg : "transparent")};
  color: ${({ theme }) => theme.text};
  text-align: left;
  cursor: pointer;
  &:active { background: ${({ theme }) => theme.surfaceHover}; }
  &:disabled { color: ${({ theme }) => theme.subText}; cursor: default; }
  & > div:first-child { display: flex; justify-content: space-between; gap: 10px; font-size: 13.5px; }
  & span:first-child { overflow-wrap: anywhere; }
  & span:last-child { flex-shrink: 0; font-weight: 600; font-variant-numeric: tabular-nums; }
`;

export const Bar = styled.div`
  height: 6px;
  margin-top: 6px;
  border-radius: 4px;
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
    border: 1.5px solid ${({ theme }) => theme.border};
    border-radius: ${({ theme }) => theme.radius.sm};
    background: ${({ theme }) => theme.cardAlt};
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
  & input { width: 20px; height: 20px; flex-shrink: 0; accent-color: ${({ theme }) => theme.primary}; }
`;

export const PrimaryBtn = styled.button`
  width: 100%;
  min-height: 52px;
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
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
  border: none;
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $danger, theme }) => ($danger ? theme.expenseSoft : theme.bgElevated)};
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

export const ModelRow = styled.button`
  width: 100%;
  min-height: 56px;
  margin-bottom: 8px;
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  box-sizing: border-box;
  border: 2px solid ${({ $active, theme }) => ($active ? theme.primary : theme.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  background: ${({ $active, theme }) => ($active ? theme.primarySoft : theme.card)};
  color: ${({ theme }) => theme.text};
  opacity: ${({ $disabled }) => ($disabled ? 0.6 : 1)};
  text-align: left;
  cursor: ${({ $disabled }) => ($disabled ? "default" : "pointer")};
  & strong { display: block; font-size: 15px; }
  & small { font-size: 12.5px; color: ${({ theme }) => theme.subText}; }
`;

export const RadioDot = styled.span`
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${({ $active, theme }) => ($active ? theme.primary : theme.borderStrong)};
  background: ${({ $active, theme }) => ($active ? theme.primary : "transparent")};
  box-shadow: inset 0 0 0 3px ${({ theme }) => theme.card};
`;

export const FoldBtn = styled.button`
  width: 100%;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px;
  border: none;
  background: transparent;
  color: ${({ theme }) => theme.subText};
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
`;

export const Badge = styled.span`
  display: inline-block;
  margin-left: 6px;
  padding: 1px 7px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.primarySoft};
  color: ${({ theme }) => theme.primaryText};
  font-size: 11px;
  font-weight: 700;
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
