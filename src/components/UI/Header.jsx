import styled from 'styled-components';

const HeaderWrap = styled.div`
  width: 100%;
  height: auto;

  padding-top: calc(env(safe-area-inset-top) + 12px);
  padding-bottom: 16px;
  padding-left: 16px;
  padding-right: 16px;

  display: flex;
  justify-content: space-between;
  align-items: center;

  background: ${({ theme }) => theme.headerBg};
  color: ${({ theme }) => theme.headerText};

  border-radius: 0 0 12px 12px;
  box-sizing: border-box;

  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.12);

  min-height: 88px;
`;



const Title = styled.h1`
  font-size: 22px;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;


const RightArea = styled.div`
  min-width: 80px;
  display: flex;
  justify-content: flex-end;
  align-items: center;
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
