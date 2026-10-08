import styled from "styled-components";
import { AiOutlineArrowLeft, AiOutlineSetting } from "react-icons/ai";

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

  /* stack: 오른쪽 영역(버튼들)을 제목 아래 둘째 줄로 내린다 — 좁은 폰 화면에서 제목과 겹치지 않게 */
  ${({ $stack }) =>
    $stack &&
    `
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    row-gap: 6px;
    padding-top: calc(env(safe-area-inset-top) + 8px);
    padding-bottom: 12px;
    min-height: 0;
  `}
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

// 제목을 눌러 이동하는 형태 — 옆의 작은 톱니바퀴가 "누를 수 있음"을 알려 주고, 눌리면 살짝 어두워진다.
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
  & > svg { opacity: 0.55; flex-shrink: 0; }
  &:active { background: ${({ theme }) => theme.activeBg}; }
`;

const RightArea = styled.div`
  min-width: 80px;
  display: flex;
  justify-content: flex-end;
  align-items: center;

  ${({ $stack }) => $stack && `width: 100%; min-width: 0; justify-content: flex-start;`}
`;

// stackRight: 오른쪽 버튼들을 제목 아래 둘째 줄에 둔다(홈 화면).
// onBack: 왼쪽에 뒤로가기 버튼을 둔다. onTitleClick: 제목 자체를 눌러 이동하는 버튼으로 만든다(홈 → 설정).
export default function Header({ title, rightButton, onBack, onTitleClick, stackRight = false }) {
  return (
    <HeaderWrap $stack={stackRight && !!rightButton}>
      <Left>
        {onBack && (
          <BackBtn type="button" aria-label="뒤로가기" onClick={onBack}>
            <AiOutlineArrowLeft size={22} />
          </BackBtn>
        )}
        {onTitleClick ? (
          <TitleBtn type="button" aria-label={`${title} — 설정 열기`} onClick={onTitleClick}>
            <Title>{title}</Title>
            <AiOutlineSetting size={17} />
          </TitleBtn>
        ) : (
          <Title>{title}</Title>
        )}
      </Left>
      <RightArea $stack={stackRight && !!rightButton}>{rightButton ? rightButton : null}</RightArea>
    </HeaderWrap>
  );
}
