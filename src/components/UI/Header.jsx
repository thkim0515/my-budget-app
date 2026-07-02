import styled from "styled-components";

const HeaderWrap = styled.div`
  width: 100%;
  max-width: 480px;
  margin: 0 auto;

  height: auto;
  padding-top: calc(env(safe-area-inset-top) + 14px);
  padding-bottom: 14px;
  padding-left: 18px;
  padding-right: 18px;

  display: flex;
  justify-content: space-between;
  align-items: center;

  background: ${({ theme }) => theme.headerBg};
  color: ${({ theme }) => theme.headerText};

  border-bottom: 1px solid ${({ theme }) => theme.border};
  box-sizing: border-box;
  min-height: 84px;
`;

const Title = styled.h1`
  font-size: 23px;
  font-weight: 800;
  letter-spacing: -0.02em;
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
      <RightArea>{rightButton ? rightButton : null}</RightArea>
    </HeaderWrap>
  );
}
