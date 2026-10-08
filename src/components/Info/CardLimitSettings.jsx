import { useSettings } from "../../context/SettingsContext";
import * as S from "../../pages/Settings/SettingsPage.styles";
import CardLimitPanel from "./CardLimitPanel";

// 설정 화면의 "카드 한도 표시" 항목 — 지금은 홈 하단 한도 영역을 눌러 여는 바텀시트(CardLimitSheet)로 옮겨
// 설정 화면에서는 숨겨 둔다(constants/ui.js 의 SHOW_CARD_LIMIT_IN_SETTINGS). 되살리려면 그 플래그를 true 로.
// 입력 항목 자체는 공용 CardLimitPanel 을 그대로 쓴다.
export default function CardLimitSettings() {
  const { settings, updateSetting } = useSettings();

  return (
    <>
      <S.SectionTitle>카드 한도 표시</S.SectionTitle>

      <S.ToggleRow>
        <span>홈 화면에 카드 한도 표시</span>
        <S.ToggleSwitch>
          <input
            type="checkbox"
            checked={settings.cardLimitEnabled}
            onChange={() => updateSetting("cardLimitEnabled", !settings.cardLimitEnabled)}
          />
          <span></span>
        </S.ToggleSwitch>
      </S.ToggleRow>

      {settings.cardLimitEnabled && <CardLimitPanel />}
    </>
  );
}
