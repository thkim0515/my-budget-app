// 화면 구성 플래그 — 코드를 지우지 않고 켜고 끌 수 있게 모아 둔다.

// 하단 내비게이션 바 표시 여부.
// false: 바를 그리지 않고, 설정 화면은 홈 상단의 "가계부" 제목을 눌러 들어간다.
// 복구: true 로 바꾸면 하단 바와 그만큼의 하단 여백이 함께 돌아온다
//       (바 안에서 어떤 탭을 보일지는 components/UI/BottomTabBar.jsx 의 TABS[].hidden 로 정한다).
export const SHOW_BOTTOM_NAV = false;

// 하단 바가 차지하는 높이(px). 바를 숨기면 0 이라 페이지 하단 여백과 고정 영역 위치가 같이 줄어든다.
export const BOTTOM_NAV_HEIGHT = SHOW_BOTTOM_NAV ? 72 : 0;

// 설정 화면에 "카드 한도 표시" 항목을 둘지 여부.
// false: 한도 설정은 홈 하단 한도 영역을 눌러 여는 바텀시트에서만 한다(코드는 CardLimitSettings 에 그대로 있음).
export const SHOW_CARD_LIMIT_IN_SETTINGS = false;

// 카드 한도를 아직 설정하지 않았을 때 홈 하단에 작은 "카드 한도 설정" 줄을 보여 줄지 여부.
// 설정 화면에서 한도 항목이 빠지면 한도가 없는 상태에서는 눌러서 시작할 곳이 없으므로 켜 둔다.
export const SHOW_CARD_LIMIT_SETUP_HINT = true;
