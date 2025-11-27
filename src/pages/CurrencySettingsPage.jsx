import styled from 'styled-components';
import { useCurrencyUnit } from '../hooks/useCurrencyUnit';
import { useNavigate } from 'react-router-dom';
import Header from "../components/Header";

/* ────────────────────────────── 레이아웃 기본 구조 ────────────────────────────── */
const PageWrap = styled.div`
  max-width: 480px;
  margin: 0 auto;
  height: 100vh;
  display: flex;
  flex-direction: column;
  color: ${({ theme }) => theme.text};
`;

const HeaderFix = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  margin: 0 auto;
  max-width: 480px;
  z-index: 20;
`;

const Content = styled.div`
  flex: 1;
  padding: 16px;
  padding-top: 96px;
  padding-bottom: calc(160px + env(safe-area-inset-bottom));

  overflow-y: auto;
`;

/* ────────────────────────────── UI 요소 ────────────────────────────── */

const SelectBox = styled.select`
  width: 100%;
  padding: 12px;
  margin-bottom: 20px;

  border-radius: 6px;
  border: 1px solid ${({ theme }) => theme.border};
  background: ${({ theme }) => theme.card};
  color: ${({ theme }) => theme.text};
`;

const BackBtn = styled.button`
  width: 100%;
  padding: 12px;
  background: #1976d2;
  color: ${({ theme }) => theme.textBright};
  border: none;
  border-radius: 6px;
`;

export default function CurrencySettingsPage() {
  const navigate = useNavigate();
  const { unit, setUnit } = useCurrencyUnit();

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
