import styled from 'styled-components';
import { Link } from 'react-router-dom';

const HeaderWrap = styled.div`
  width: 100%;
  height: 68px;                    /* 고정 높이 */
  padding: 0 16px;                 /* 세로 패딩 제거 */
  display: flex;
  justify-content: space-between;
  align-items: center;

  background: ${({ theme }) => theme.headerBg};
  color: ${({ theme }) => theme.headerText};
  border-radius: 0 0 12px 12px;
  box-sizing: border-box;
`;



const Title = styled.h1`
  font-size: 20px;
  margin: 0;
  white-space: nowrap;        /* 줄바꿈 금지 */
  overflow: hidden;
  text-overflow: ellipsis;    /* 너무 길면 … 처리 */
`;

const RightArea = styled.div`
  min-width: 100px;          /* 버튼 공간 확보 */
  display: flex;
  justify-content: flex-end;
`;

const Btn = styled.button`
  background: #fff;
  color: #1976d2;
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
`;

export default function Header({ title, rightButton }) {
  return (
    <HeaderWrap>
      <Title>{title}</Title>

      <RightArea>
        {rightButton ? rightButton : null}
      </RightArea>
    </HeaderWrap>
  );
}
