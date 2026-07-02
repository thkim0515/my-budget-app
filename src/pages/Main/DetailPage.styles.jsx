import styled, { keyframes } from "styled-components";

export const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  position: relative;
  color: ${({ theme }) => theme.text};
  background-color: ${({ theme }) => theme.bg};
`;

/* 헤더 우측: 납부완료 항목을 이 달 합계에서 제외하는 토글 */
export const ExcludePaidToggleBtn = styled.button`
  background: ${({ $on, theme }) => ($on ? theme.primary : theme.cardAlt)};
  color: ${({ $on, theme }) => ($on ? "#fff" : theme.subText)};
  padding: 8px 12px;
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid ${({ $on, theme }) => ($on ? theme.primary : theme.border)};
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.2s, border-color 0.2s, color 0.2s;
  &:active { transform: scale(0.95); }
`;

export const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  margin: 0 auto;
  width: 100%;
  max-width: 480px;
  z-index: 20;
`;

export const Content = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  padding-top: 92px;
  padding-bottom: calc(140px + env(safe-area-inset-bottom));
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  &::-webkit-scrollbar { display: none; }
`;

/* 잔액 히어로 카드 */
export const SummaryCard = styled.div`
  position: relative;
  overflow: hidden;
  background: ${({ theme }) => theme.headerGradient};
  border-radius: ${({ theme }) => theme.radius.lg};
  padding: 22px 20px 18px;
  margin-bottom: 20px;
  color: #fff;
  box-shadow: ${({ theme }) => theme.shadowPrimary};
  &::after {
    content: "";
    position: absolute;
    top: -40px;
    right: -30px;
    width: 140px;
    height: 140px;
    background: rgba(255, 255, 255, 0.12);
    border-radius: 50%;
  }
`;

export const BalanceLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  opacity: 0.85;
  margin-bottom: 4px;
`;

export const BalanceAmount = styled.div`
  font-size: 30px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  color: ${({ $negative }) => ($negative ? "#FFD7DD" : "#fff")};
`;

export const ExcludedNote = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 11.5px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: ${({ theme }) => theme.radius.pill};
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
`;

export const StatGrid = styled.div`
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-top: 18px;
`;

export const StatChip = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(2px);
  span {
    font-size: 11px;
    font-weight: 600;
    opacity: 0.85;
  }
  strong {
    font-size: 14px;
    font-weight: 800;
    letter-spacing: -0.01em;
    white-space: nowrap;
  }
`;

/* FAB */
export const FAB = styled.button`
  position: fixed;
  bottom: calc(88px + env(safe-area-inset-bottom));
  right: max(16px, calc(50% - 224px));
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: ${({ theme }) => theme.gradientPrimary};
  color: white;
  border: none;
  font-size: 30px;
  font-weight: 300;
  cursor: pointer;
  box-shadow: ${({ theme }) => theme.shadowPrimary};
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 30;
  transition: transform 0.15s, box-shadow 0.15s;
  &:active {
    transform: scale(0.92);
  }
`;

/* Bottom sheet */
export const SheetBackdrop = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(10, 15, 30, 0.5);
  z-index: 40;
  animation: fadeIn 0.2s ease;
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
`;

export const Sheet = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 480px;
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
  border-radius: ${({ theme }) => theme.radius.xl} ${({ theme }) => theme.radius.xl} 0 0;
  padding: 12px 20px 0;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
  z-index: 41;
  max-height: 92vh;
  overflow-y: auto;
  box-shadow: ${({ theme }) => theme.shadowLg};
  animation: slideUp 0.28s cubic-bezier(0.2, 0, 0, 1);
  @keyframes slideUp {
    from { transform: translateX(-50%) translateY(40px); opacity: 0.6; }
    to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
  }
  &::-webkit-scrollbar { display: none; }
`;

export const SheetHandle = styled.div`
  width: 44px;
  height: 5px;
  background: ${({ theme }) => theme.borderStrong};
  border-radius: 999px;
  margin: 0 auto 18px;
`;

/* 수정 중 배너 */
const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.75; }
`;

export const EditBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 12px;
  background: ${({ theme }) => theme.primarySoft};
  border: 1px solid ${({ theme }) => theme.primary};
  border-radius: ${({ theme }) => theme.radius.sm};
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.primaryText};
  animation: ${pulse} 2s ease infinite;
`;

export const EditBannerCancel = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  font-size: 13px;
  font-weight: 700;
  color: ${({ theme }) => theme.subText};
  padding: 2px 4px;
  &:active { opacity: 0.7; }
`;
