import Header from "../../components/UI/Header";
import * as S from "./TextColorSettingsPage.styles";

export default function TextColorSettingsPage({
  lightTextColor,
  setLightTextColor,
  darkTextColor,
  setDarkTextColor,
}) {
  // 글자색 변경 핸들러
  const handleColorChange = (type, color) => {
    if (type === "light") {
      setLightTextColor(color);
      localStorage.setItem("lightTextColor", color);
    } else {
      setDarkTextColor(color);
      localStorage.setItem("darkTextColor", color);
    }
  };

  // 색상 초기화
  const resetColors = () => {
    if (!window.confirm("글자 색상을 기본값으로 초기화하시겠습니까?")) return;
    setLightTextColor("#222222");
    setDarkTextColor("#e5e5e5");
    localStorage.removeItem("lightTextColor");
    localStorage.removeItem("darkTextColor");
  };

  return (
    <S.PageWrap>
      <S.HeaderFix>
        <Header title="글자 색상 설정" />
      </S.HeaderFix>

      <S.Content>
        <S.Section>
          <S.Label>라이트 모드 글자색</S.Label>
          <S.ColorInput
            type="color"
            value={lightTextColor}
            onChange={(e) => handleColorChange("light", e.target.value)}
          />
        </S.Section>

        <S.Section>
          <S.Label>다크 모드 글자색</S.Label>
          <S.ColorInput
            type="color"
            value={darkTextColor}
            onChange={(e) => handleColorChange("dark", e.target.value)}
          />
        </S.Section>

        <S.ResetBtn onClick={resetColors}>색상 설정 초기화</S.ResetBtn>
      </S.Content>
    </S.PageWrap>
  );
}