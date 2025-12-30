import React from "react";
import Header from "../../components/UI/Header";
import * as S from "./TextColorSettingsPage.styles";
import { useSettings } from "../../context/SettingsContext"; // Context 훅 임포트

/**
 * 글자 색상 설정 페이지 컴포넌트
 */
export default function TextColorSettingsPage() {
  // 중앙 설정 본부에서 현재 값(settings)과 변경 함수(updateSetting)
  const { settings, updateSetting } = useSettings();

  // 글자색 변경 핸들러
  const handleColorChange = (type, color) => {
    // Context의 updateSetting을 호출
    const key = type === "light" ? "lightTextColor" : "darkTextColor";
    updateSetting(key, color);
  };

  // 색상 초기화
  const resetColors = () => {
    // 기존의 사용자 확인 로직 유지
    if (!window.confirm("글자 색상을 기본값으로 초기화하시겠습니까?")) return;
    
    updateSetting("lightTextColor", "#222222");
    updateSetting("darkTextColor", "#e5e5e5");
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
            // Context에 저장된 현재 라이트 모드 색상 사용
            value={settings.lightTextColor}
            onChange={(e) => handleColorChange("light", e.target.value)}
          />
        </S.Section>

        <S.Section>
          <S.Label>다크 모드 글자색</S.Label>
          <S.ColorInput
            type="color"
            // Context에 저장된 현재 다크 모드 색상 사용
            value={settings.darkTextColor}
            onChange={(e) => handleColorChange("dark", e.target.value)}
          />
        </S.Section>

        <S.ResetBtn onClick={resetColors}>색상 설정 초기화</S.ResetBtn>
      </S.Content>
    </S.PageWrap>
  );
}