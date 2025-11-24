import styled from 'styled-components';
import { useCurrencyUnit } from '../hooks/useCurrencyUnit';
import { useNavigate } from 'react-router-dom';

const Wrap = styled.div`
  padding: 16px;
`;

const SelectBox = styled.select`
  width: 100%;
  padding: 12px;
  margin-bottom: 20px;
  border-radius: 6px;
  border: 1px solid #ccc;
`;

const BackBtn = styled.button`
  width: 100%;
  padding: 12px;
  background: #1976d2;
  color: white;
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
    <Wrap>
      <h2 style={{ marginBottom: "20px" }}>금액 기호 설정</h2>

      <SelectBox value={unit} onChange={changeUnit}>
        <option value="원">원</option>
        <option value="₩">₩</option>
        <option value="$">$</option>
        <option value="€">€</option>
        <option value="¥">¥</option>
      </SelectBox>

      <BackBtn onClick={() => navigate(-1)}>뒤로가기</BackBtn>
    </Wrap>
  );
}
