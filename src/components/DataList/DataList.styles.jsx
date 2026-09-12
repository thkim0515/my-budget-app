/* src/components/DataList/DataList.styles.jsx */
import styled, { keyframes } from "styled-components";

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const List = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const ListItem = styled.li`
  margin-bottom: 10px;
  outline: none;
  list-style: none;
  touch-action: ${({ $isReorderMode }) => ($isReorderMode ? "none" : "pan-y")};
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  z-index: ${({ $isDragging }) => ($isDragging ? 9999 : 1)};
`;

export const ItemCard = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: ${({ theme, $isEditing }) =>
    $isEditing ? theme.primarySoft : theme.card};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1.5px solid ${({ theme, $isDragging, $isEditing }) =>
    $isDragging || $isEditing ? theme.primary : theme.border};
  transition: ${({ $isDragging }) => ($isDragging ? "none" : "background 0.2s ease, transform 0.18s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s ease, border-color 0.2s")};
  transform: ${({ $isDragging }) => ($isDragging ? "scale(1.04)" : "scale(1)")};
  box-shadow: ${({ $isDragging, theme }) =>
    $isDragging ? theme.shadowLg : theme.shadowSm};
  opacity: ${({ $isPaid, $isDragging, $excluded }) =>
    $isDragging ? 1 : $excluded ? 0.58 : $isPaid ? 0.9 : 1};
  cursor: grab;
  &:active { cursor: grabbing; }
`;

export const SelectCheckbox = styled.div`
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 2px solid ${({ theme, $checked }) => ($checked ? theme.primary : theme.border)};
  background: ${({ theme, $checked }) => ($checked ? theme.primary : "transparent")};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: 900;
  transition: background 0.15s, border-color 0.15s;
  opacity: ${({ $disabled }) => ($disabled ? 0.35 : 1)};
`;

export const CardLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
`;

export const CategoryIconWrap = styled.div`
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 18px;
  background: ${({ theme, $tone }) =>
    $tone === "income" ? theme.incomeSoft : $tone === "expense" ? theme.expenseSoft : theme.primarySoft};
  color: ${({ theme, $tone }) =>
    $tone === "income" ? theme.incomeColor : $tone === "expense" ? theme.expenseColor : theme.primaryText};
`;

export const CardInfo = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
`;

export const CardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 15px;
  font-weight: 700;
  color: ${({ theme }) => theme.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const CardMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${({ theme }) => theme.mutedText};
  font-weight: 500;
`;

export const CardRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`;

export const CardAmount = styled.div`
  font-size: 15.5px;
  font-weight: 800;
  letter-spacing: -0.01em;
  white-space: nowrap;
  text-decoration: ${({ $excluded }) => ($excluded ? "line-through" : "none")};
  color: ${({ theme, $tone, $excluded }) =>
    $excluded ? theme.mutedText : $tone === "income" ? theme.incomeColor : $tone === "expense" ? theme.expenseColor : theme.text};
`;

export const Badge = styled.span`
  font-size: 10px;
  padding: 2px 7px;
  border-radius: ${({ theme }) => theme.radius.pill};
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  background: ${({ theme, $kind }) =>
    $kind === "excluded" ? theme.warningSoft : $kind === "count" ? theme.primarySoft : theme.paidBadgeBg};
  color: ${({ theme, $kind }) =>
    $kind === "excluded" ? theme.warning : $kind === "count" ? theme.primaryText : theme.paidBadgeText};
`;

export const PaidBadge = styled(Badge)`
  background: ${({ theme }) => theme.paidBadgeBg};
  color: ${({ theme }) => theme.paidBadgeText};
`;

export const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 26px;
  margin-bottom: 12px;
  padding: 0 2px;
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.01em;
    color: ${({ theme }) => theme.text};
    display: flex;
    align-items: center;
    gap: 8px;
  }
`;

export const SectionDot = styled.span`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ theme, $tone }) =>
    $tone === "income" ? theme.incomeColor : $tone === "expense" ? theme.expenseColor : theme.primary};
`;

export const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const ToggleLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: ${({ theme }) => theme.subText};
  cursor: pointer;
  user-select: none;
`;

export const ToggleSwitch = styled.div`
  position: relative;
  width: 38px;
  height: 22px;
  background-color: ${({ $isOn, theme }) => ($isOn ? theme.primary : theme.borderStrong)};
  border-radius: 22px;
  transition: background-color 0.25s;
  flex-shrink: 0;
  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: ${({ $isOn }) => ($isOn ? "18px" : "2px")};
    width: 18px;
    height: 18px;
    background-color: #fff;
    border-radius: 50%;
    transition: left 0.25s;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }
`;

export const CollapseBtn = styled.button`
  background: ${({ theme }) => theme.cardAlt};
  border: 1px solid ${({ theme }) => theme.border};
  color: ${({ theme }) => theme.subText};
  font-size: 12px;
  font-weight: 600;
  padding: 5px 10px;
  border-radius: ${({ theme }) => theme.radius.pill};
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  &:active { transform: scale(0.95); }
`;

export const EmptyState = styled.li`
  list-style: none;
  text-align: center;
  padding: 24px 0;
  font-size: 13px;
  color: ${({ theme }) => theme.mutedText};
  background: ${({ theme }) => theme.cardAlt};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px dashed ${({ theme }) => theme.border};
`;

export const EditingDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ theme }) => theme.primary};
  flex-shrink: 0;
  box-shadow: 0 0 0 3px ${({ theme }) => theme.primarySoft};
`;

export const PullToRefreshContainer = styled.div`
  position: relative;
  overflow: hidden;
  user-select: none;
`;

export const RefreshIndicator = styled.div`
  position: absolute;
  top: -50px;
  left: 0;
  right: 0;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: ${({ theme }) => theme.mutedText};
  transform: translateY(${({ $pullDistance }) => Math.min($pullDistance, 60)}px);
  transition: ${({ $isRefreshing }) => ($isRefreshing ? "none" : "transform 0.2s ease")};
  z-index: 10;
  .spin { animation: ${spin} 1s linear infinite; }
`;

export const RefreshContent = styled.div`
  transform: ${({ $pullDistance }) => $pullDistance > 0 ? `translateY(${Math.min($pullDistance, 60)}px)` : "none"};
  transition: ${({ $isRefreshing, $pullDistance }) => ($isRefreshing || $pullDistance === 0 ? "transform 0.2s ease" : "none")};
`;
