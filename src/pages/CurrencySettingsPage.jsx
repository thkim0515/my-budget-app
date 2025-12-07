// 스타일 컴포넌트와 훅 불러오기
import styled from "styled-components";
import { useCurrencyUnit } from "../hooks/useCurrencyUnit";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";

// 페이지 전체 레이아웃 컨테이너
const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.text};
`;

// 상단 헤더 고정 영역
const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  margin: 0 auto;
  max-width: 480px;
  z-index: 20;
`;

// 본문 스크롤 영역
const Content = styled.div`
  flex: 1;
  padding: 16px;
  padding-top: 96px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
  overflow-y: auto;
`;

// 통화 단위 선택 드롭다운
const SelectBox = styled.select`
  width: 100%;
  padding: 12px;
  margin-bottom: 20px;
  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
`;

// 뒤로가기 버튼 스타일
const BackBtn = styled.button`
  width: 100%;
  padding: 12px;
  background: #1976d2;
  color: ${({ theme }) => theme.textBright};
  border: none;
  border-radius: 6px;
`;

// 금액 기호 설정 페이지 컴포넌트
export default function CurrencySettingsPage() {
  const navigate = useNavigate(); // 페이지 이동 훅
  const { unit, setUnit } = useCurrencyUnit(); // 통화 단위 상태

  // 단위 변경 이벤트 처리
  const changeUnit = (e) => {
    setUnit(e.target.value);
  };

  return (
    <PageWrap>
      <HeaderFix>
        <Header title="금액 기호 설정" />
      </HeaderFix>

      <Content>
        <h2 style={{ marginBottom: "20px" }}>금액 기호 설정</h2>

        <SelectBox value={unit} onChange={changeUnit}>
          <option value="원">원</option>
          <option value="₩">₩</option>
          <option value="$">$</option>
          <option value="€">€</option>
          <option value="¥">¥</option>
        </SelectBox>

        {/* <BackBtn onClick={() => navigate(-1)}>뒤로가기</BackBtn> */}
      </Content>
    </PageWrap>
  );
}
