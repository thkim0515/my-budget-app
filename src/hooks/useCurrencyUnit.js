import { useSettings } from "../context/SettingsContext"; // Context 사용

export function useCurrencyUnit() {
  // 전역 설정 본부에서 값(settings)과 변경 함수(updateSetting)
  const { settings, updateSetting } = useSettings();

  const setUnit = (newUnit) => {
    updateSetting("currencyUnit", newUnit);
  };

  // 기존과 동일한 객체 구조 { unit, setUnit }를 반환하여 하위 호환성을 보장
  return { 
    unit: settings.currencyUnit, 
    setUnit 
  };
}