import styled from "styled-components";
import { Link } from "react-router-dom";
import { FiEdit3, FiCopy, FiCheckCircle, FiTrash2 } from "react-icons/fi";

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Item = styled.div`
  background: ${({ theme }) => theme.card};
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border};
  display: flex;
  align-items: center;
  padding: 12px;
  justify-content: space-between;
  gap: 12px;
  transition: background-color 0.15s ease, transform 0.1s ease, opacity 0.15s ease;

  &:active {
    background: ${({ theme }) => theme.activeBg};
    transform: scale(0.98);
  }
`;

const LinkTitle = styled(Link)`
  flex: 1;
  color: ${({ theme }) => theme.text};
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Actions = styled.div`
  display: flex;
  gap: 6px;
  flex-shrink: 0;
`;

const ActionButton = styled.button`
  border: none;
  color: #ffffff;
  border-radius: 6px;
  padding: 5px 8px;
  font-size: 11px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;

  &:hover {
    filter: brightness(1.05);
  }
`;

export default function ChapterList({
  chapters = [],
  onRename = () => {},
  onCopy = () => {},
  onDelete = () => {},
  onToggleComplete = () => {},
}) {
  return (
    <List>
      {chapters.map((ch) => (
        <Item key={ch.chapterId} style={{ opacity: ch.isCompleted ? 0.7 : 1, filter: ch.isCompleted ? "grayscale(0.3)" : "none" }}>
          <LinkTitle to={`/detail/chapter/${ch.chapterId}`}>{ch.title}</LinkTitle>
          <Actions>
            <ActionButton
              type="button"
              style={{ background: "#4caf50" }}
              onClick={() => onToggleComplete(ch)}
              title={ch.isCompleted ? "해제" : "완료"}
            >
              <FiCheckCircle size={11} />
              {ch.isCompleted ? "해제" : "완료"}
            </ActionButton>

            <ActionButton type="button" style={{ background: "#6f42c1" }} onClick={() => onRename(ch)} title="편집">
              <FiEdit3 size={11} />
            </ActionButton>

            <ActionButton type="button" style={{ background: "#1976d2" }} onClick={() => onCopy(ch)} title="복사">
              <FiCopy size={11} />
            </ActionButton>

            <ActionButton
              type="button"
              style={{ background: "#d9534f" }}
              onClick={() => onDelete(ch.chapterId)}
              title="삭제"
            >
              <FiTrash2 size={11} />
              삭제
            </ActionButton>
          </Actions>
        </Item>
      ))}
    </List>
  );
}
