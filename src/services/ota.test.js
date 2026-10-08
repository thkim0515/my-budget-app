// OTA 시작 업데이트 흐름 테스트 — 네이티브 플러그인은 모킹한다.
process.env.REACT_APP_OTA_BUNDLE_NO = "100";

const mockHttpGet = jest.fn();
const mockUpdater = {
  list: jest.fn(),
  download: jest.fn(),
  set: jest.fn(),
  next: jest.fn(),
  notifyAppReady: jest.fn(),
  addListener: jest.fn(),
};

// Jest 27 에는 advanceTimersByTimeAsync 가 없어, 타이머를 앞당긴 뒤 대기 중인 Promise 를 비워 준다.
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const advance = async (ms) => { jest.advanceTimersByTime(ms); await flush(); };
let mockBuild = "2";

jest.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
  CapacitorHttp: { get: (...a) => mockHttpGet(...a) },
}));
jest.mock("@capacitor/app", () => ({
  App: { getInfo: () => Promise.resolve({ build: mockBuild }) },
}));
jest.mock("@capgo/capacitor-updater", () => ({ CapacitorUpdater: mockUpdater }));

const { startupUpdate, markAppReady } = require("./ota");

const manifest = (over = {}) => ({
  status: 200,
  data: { bundleNo: 101, version: "v1.1", minNativeBuild: 2, url: "https://x/b.zip", checksum: "abc", ...over },
});
const hooks = () => ({ onUpdating: jest.fn(), onProgress: jest.fn() });

beforeEach(() => {
  // CRA 의 resetMocks 가 매 테스트마다 구현을 비우므로 여기서 다시 채운다.
  mockUpdater.notifyAppReady.mockImplementation(() => Promise.resolve());
  mockUpdater.addListener.mockImplementation(() => Promise.resolve({ remove: () => Promise.resolve() }));
  mockBuild = "2";
  mockUpdater.list.mockResolvedValue({ bundles: [] });
});

test("새 번들이 있으면 안내를 띄우고 받은 즉시 적용한다", async () => {
  mockHttpGet.mockResolvedValue(manifest());
  mockUpdater.download.mockResolvedValue({ id: "id1" });
  mockUpdater.list
    .mockResolvedValueOnce({ bundles: [] }) // getBundle 의 확인
    .mockResolvedValue({ bundles: [{ id: "id1", version: "101", status: "pending" }] });
  const h = hooks();
  await startupUpdate(h);
  expect(h.onUpdating).toHaveBeenCalledWith("v1.1 (101)");
  expect(mockUpdater.download).toHaveBeenCalledWith({ url: "https://x/b.zip", version: "101", checksum: "abc" });
  expect(h.onProgress).toHaveBeenCalledWith(100);
  expect(mockUpdater.set).toHaveBeenCalledWith({ id: "id1" });
});

test("같거나 낮은 번들 번호면 아무것도 하지 않는다", async () => {
  mockHttpGet.mockResolvedValue(manifest({ bundleNo: 100 }));
  const h = hooks();
  await startupUpdate(h);
  expect(h.onUpdating).not.toHaveBeenCalled();
  expect(mockUpdater.set).not.toHaveBeenCalled();
});

test("설치된 APK 가 최소 요구보다 낮으면 적용하지 않는다", async () => {
  mockBuild = "1";
  mockHttpGet.mockResolvedValue(manifest());
  const h = hooks();
  await startupUpdate(h);
  expect(h.onUpdating).not.toHaveBeenCalled();
  expect(mockUpdater.download).not.toHaveBeenCalled();
});

test("확인이 4초를 넘으면 현재 버전으로 그냥 들어간다", async () => {
  jest.useFakeTimers();
  mockHttpGet.mockReturnValue(new Promise(() => {}));
  const h = hooks();
  const p = startupUpdate(h);
  await advance(4001);
  await p;
  expect(h.onUpdating).not.toHaveBeenCalled();
  expect(mockUpdater.set).not.toHaveBeenCalled();
  jest.useRealTimers();
});

test("다운로드가 10초를 넘으면 들어가고, 다 받으면 다음 재시작에 적용되게 건다", async () => {
  jest.useFakeTimers();
  mockHttpGet.mockResolvedValue(manifest());
  let finish;
  mockUpdater.download.mockReturnValue(new Promise((r) => (finish = r)));
  const h = hooks();
  const p = startupUpdate(h);
  await flush(); // 매니페스트 확인이 끝나고 10초 타이머가 걸린 뒤에 시간을 앞당긴다
  await advance(10001);
  await p;
  expect(h.onUpdating).toHaveBeenCalled(); // 안내는 떴다가
  expect(mockUpdater.set).not.toHaveBeenCalled(); // 즉시 적용은 하지 않고 앱으로 들어간다
  mockUpdater.list.mockResolvedValue({ bundles: [{ id: "late", version: "101", status: "pending" }] });
  finish({ id: "late" });
  await advance(500);
  expect(mockUpdater.next).toHaveBeenCalledWith({ id: "late" });
  jest.useRealTimers();
});

test("이미 실패한 번들 버전은 다시 받지 않는다", async () => {
  mockHttpGet.mockResolvedValue(manifest());
  mockUpdater.list.mockResolvedValue({ bundles: [{ id: "bad", version: "101", status: "error" }] });
  const h = hooks();
  await startupUpdate(h);
  expect(mockUpdater.download).not.toHaveBeenCalled();
  expect(mockUpdater.set).not.toHaveBeenCalled();
});

test("notifyAppReady 는 한 번만 보낸다", () => {
  markAppReady();
  markAppReady();
  expect(mockUpdater.notifyAppReady).toHaveBeenCalledTimes(1);
});
