import styled from "styled-components";
import { AiOutlineArrowLeft } from "react-icons/ai";

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

  /* 좁은 폰 화면에서는 좌우 여백을 줄여 제목과 버튼이 한 줄에 들어가게 한다 */
  @media (max-width: 440px) {
    padding-left: 14px;
    padding-right: 14px;
  }
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

const Left = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
`;

// 눌리는 영역은 최소 44px 로 잡아 손가락으로 쉽게 누를 수 있게 한다.
const BackBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  margin-left: -10px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  flex-shrink: 0;
  &:active { background: ${({ theme }) => theme.activeBg}; }
`;

// 제목을 눌러 이동하는 형태 — 눌리는 동안 배경이 살짝 진해지고 글자가 눌린다(별도 아이콘 없음).
const TitleBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  margin: 0 0 0 -8px;
  padding: 0 8px;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: inherit;
  font: inherit;
  cursor: pointer;
  flex-shrink: 0;
  -webkit-tap-highlight-color: transparent;
  &:active { background: ${({ theme }) => theme.activeBg}; transform: scale(0.97); }
`;

const RightArea = styled.div`
  min-width: 80px;
  display: flex;
  justify-content: flex-end;
  align-items: center;

`;

// onBack: 왼쪽에 뒤로가기 버튼을 둔다. onTitleClick: 제목 자체를 눌러 이동하는 버튼으로 만든다(홈 → 설정).
export default function Header({ title, rightButton, onBack, onTitleClick }) {
  return (
    <HeaderWrap>
      <Left>
        {onBack && (
          <BackBtn type="button" aria-label="뒤로가기" onClick={onBack}>
            <AiOutlineArrowLeft size={22} />
          </BackBtn>
        )}
        {onTitleClick ? (
          <TitleBtn type="button" aria-label={`${title} — 설정 열기`} onClick={onTitleClick}>
            <Title>{title}</Title>
          </TitleBtn>
        ) : (
          <Title>{title}</Title>
        )}
      </Left>
      <RightArea>{rightButton ? rightButton : null}</RightArea>
    </HeaderWrap>
  );
}
