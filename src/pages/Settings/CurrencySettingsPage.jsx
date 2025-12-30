import { useCurrencyUnit } from "../../hooks/useCurrencyUnit";
import Header from "../../components/UI/Header";

import * as S from './CurrencySettingsPage.styles'

// 금액 기호 설정 페이지 컴포넌트
export default function CurrencySettingsPage() {
  const { unit, setUnit } = useCurrencyUnit(); // 통화 단위 상태

  // 단위 변경 이벤트 처리
  const changeUnit = (e) => {
    setUnit(e.target.value);
  };

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header title="금액 기호 설정" />
      </S.HeaderFix>

      <S.Content>
        <h2 style={{ marginBottom: "20px" }}>금액 기호 설정</h2>

        <S.SelectBox value={unit} onChange={changeUnit}>
          <option value="원">원</option>
          <option value="₩">₩</option>
          <option value="$">$</option>
          <option value="€">€</option>
          <option value="¥">¥</option>
        </S.SelectBox>

        {/* <BackBtn onClick={() => navigate(-1)}>뒤로가기</BackBtn> */}
      </S.Content>
    </S.PageWrap>
  );
}
