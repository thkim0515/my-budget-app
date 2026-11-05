import { useRef } from "react";
import styled from "styled-components";
import { sourceById } from "../../utils/spendParser";

const Row = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
  overflow-x: auto;
  padding-bottom: 2px;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;
const Chip = styled.button`
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 14px;
  box-sizing: border-box;
  border: 1.5px solid ${({ $off, $edit, theme }) => ($off || $edit ? theme.border : theme.primary)};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ $off, $edit, theme }) => ($off || $edit ? "transparent" : theme.primarySoft)};
  color: ${({ $off, theme }) => ($off ? theme.mutedText : theme.primaryText)};
  font-size: 14px;
  font-weight: ${({ $off }) => ($off ? 500 : 700)};
  text-decoration: ${({ $off }) => ($off ? "line-through" : "none")};
  opacity: ${({ $off }) => ($off ? 0.6 : 1)};
  white-space: nowrap;
  cursor: pointer;
  transition: background 0.15s, opacity 0.15s, border-color 0.15s;
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.primary}; outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { transition: none; }
`;

// 수집 중인 금융사를 칩으로 바로 보여 주고, 누르면 이 화면에서만 켜고 끈다. 길게 누르면 전부 켜기/끄기.
export default function SourceChips({ ids, offIds, onToggle, onToggleAll, onEdit }) {
  const timer = useRef(null);
  const longPressed = useRef(false);
  const start = () => {
    longPressed.current = false;
    timer.current = setTimeout(() => { longPressed.current = true; onToggleAll(); }, 600);
  };
  const cancel = () => clearTimeout(timer.current);
  const click = (id) => {
    if (!longPressed.current) onToggle(id);
    longPressed.current = false;
  };

  return (
    <Row role="group" aria-label="보는 금융사">
      {ids.map((id) => {
        const off = offIds.includes(id);
        return (
          <Chip key={id} type="button" $off={off} aria-pressed={!off} onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel} onPointerCancel={cancel} onClick={() => click(id)}>
            {sourceById(id)?.name || id}
          </Chip>
        );
      })}
      <Chip type="button" $edit onClick={onEdit}>{ids.length === 0 ? "＋ 금융사 선택" : "＋ 편집"}</Chip>
    </Row>
  );
}
