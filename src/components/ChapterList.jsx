import styled from "styled-components";
import { Link } from "react-router-dom";

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Item = styled(Link)`
  padding: 14px;
  background: ${({ theme }) => theme.card};
  border-radius: 6px;
  text-decoration: none;
  color: ${({ theme }) => theme.text};
  border: 1px solid ${({ theme }) => theme.border};
  transition: background-color 0.15s ease, transform 0.1s ease;

  &:active {
    background: ${({ theme }) => theme.activeBg};
    transform: scale(0.98);
  }
`;

export default function ChapterList({ chapters }) {
  return (
    <List>
      {chapters.map((ch) => (
        <Item key={ch.chapterId} to={`/detail/${ch.chapterId}`}>
          {ch.title}
        </Item>
      ))}
    </List>
  );
}
