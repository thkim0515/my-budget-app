// 새 APK 안내 판단(decideUpdate) 테스트 — 순수 계산이라 네이티브 모킹은 최소한만 한다.
jest.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => false }, CapacitorHttp: { get: jest.fn() } }));
jest.mock("@capacitor/app", () => ({ App: { getInfo: jest.fn() } }));

const { decideUpdate } = require("./appUpdate");

const latest = (over = {}) => ({ versionCode: 4, versionName: "1.1.2", notes: " 변경 한 줄 ", minVersionCode: 0, ...over });

test("설치본이 같거나 높으면 안내하지 않는다", () => {
  expect(decideUpdate(latest(), 4, 0)).toBeNull();
  expect(decideUpdate(latest(), 5, 0)).toBeNull();
  expect(decideUpdate(null, 3, 0)).toBeNull();
  expect(decideUpdate({ versionCode: "x" }, 3, 0)).toBeNull();
});

test("새 버전이 있으면 선택 업데이트로 안내한다(변경 내용은 앞뒤 공백 제거)", () => {
  expect(decideUpdate(latest(), 3, 0)).toEqual({ versionCode: 4, versionName: "1.1.2", notes: "변경 한 줄", force: false });
});

test("이번 실행에서 '나중에' 누른 버전은 다시 묻지 않는다", () => {
  expect(decideUpdate(latest(), 3, 4)).toBeNull();
});

test("설치본이 minVersionCode(강제 릴리스 중 가장 높은 번호)보다 낮으면 강제 — '나중에'를 눌렀어도 다시 안내", () => {
  expect(decideUpdate(latest({ minVersionCode: 4 }), 3, 4).force).toBe(true);
  expect(decideUpdate(latest({ minVersionCode: 3 }), 2, 0).force).toBe(true);
  // 강제 릴리스(3)는 이미 설치 — 그 뒤 선택 릴리스(4)는 선택
  expect(decideUpdate(latest({ minVersionCode: 3 }), 3, 0).force).toBe(false);
});
