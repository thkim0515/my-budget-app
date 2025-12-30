import styled from 'styled-components';

const List = styled.ul`
  margin-top: 10px;
  margin-bottom: 20px;
`;

const Item = styled.li`
  padding: 10px;
  background: #f7f7f7;
  border-radius: 6px;
  margin-bottom: 8px;
  display: flex;
  justify-content: space-between;
`;

export default function RecordList({ items }) {
  return (
    <List>
      {items.map(r => (
        <Item key={r.id}>
          <span>{r.title}</span>
          <span>{r.amount}</span>
        </Item>
      ))}
    </List>
  );
}
