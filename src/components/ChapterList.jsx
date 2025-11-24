import styled from 'styled-components';
import { Link } from 'react-router-dom';

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const Item = styled(Link)`
  padding: 14px;
  background: #f0f0f0;
  border-radius: 6px;
  text-decoration: none;
  color: black;
`;

export default function ChapterList({ chapters }) {
  return (
    <List>
      {chapters.map(ch => (
        <Item key={ch.chapterId} to={`/detail/${ch.chapterId}`}>
          {ch.title}
        </Item>
      ))}
    </List>
  );
}
