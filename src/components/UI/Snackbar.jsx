import { useEffect } from "react";
import styled from "styled-components";
import { BOTTOM_NAV_HEIGHT } from "../../constants/ui";

const Bar = styled.div`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(${BOTTOM_NAV_HEIGHT + 12}px + env(safe-area-inset-bottom));
  width: calc(100% - 32px);
  max-width: 448px;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 12px;
  background: ${({ theme }) => theme.heroBg};
  color: ${({ theme }) => theme.heroText};
  font-size: 14px;
  line-height: 1.4;
  box-shadow: ${({ theme }) => theme.shadowLg};
`;

const Action = styled.button`
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 8px;
  border: none;
  background: none;
  color: ${({ theme }) => theme.heroFill};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
`;

export default function Snackbar({ message, actionLabel, onAction, onClose, ms = 7000 }) {
  useEffect(() => {
    const t = setTimeout(onClose, ms);
    return () => clearTimeout(t);
  }, [message, ms, onClose]);
  return (
    <Bar role="status">
      <span>{message}</span>
      {onAction && <Action type="button" onClick={onAction}>{actionLabel}</Action>}
    </Bar>
  );
}
