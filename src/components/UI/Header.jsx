import styled from "styled-components";

const HeaderWrap = styled.div`
  /* 가로 너비를 부모 안에서 최대 480px로 제한하고 중앙 정렬 */
  width: 100%;
  max-width: 480px;
  margin: 0 auto;

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

  /* 양옆이 꽉 찬 느낌을 주려면 radius를 제거하거나 유지할 수 있습니다 */
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
      <RightArea>{rightButton ? rightButton : null}</RightArea>
    </HeaderWrap>
  );
}
