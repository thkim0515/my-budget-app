import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { CapacitorUpdater } from "@capgo/capacitor-updater";

// ── OTA 웹 번들 업데이트 (자체 호스팅) ─────────────────────────────────────────
// main 에 push 하면 GitHub Actions 가 웹을 빌드해 GitHub Release(태그 ota)에
// 번들 zip 과 latest.json 으로 올린다(공개 저장소라 누구나 읽기).
// 앱을 켤 때 latest.json 을 보고 더 새 번들이면 "업데이트 중..." 을 띄워 바로 받아 적용하고
// (startupUpdate), 쓰는 중 새 번들이 나오면 받아 두었다가 다음 백그라운드/재시작 때 적용한다.
// 새 번들이 시작 직후 notifyAppReady() 를 못 부르면(크래시 등) 플러그인이 이전 번들로
// 자동 롤백한다(appReadyTimeout).

// 지금 실행 중인 웹 번들의 번호(빌드 시 커밋 개수로 박힘)
export const BUNDLE_NO = Number(process.env.REACT_APP_OTA_BUNDLE_NO) || 0;

// 공개 저장소의 고정 태그 Release(ota)에 번들 zip 과 latest.json 이 올라온다(로그인 없이 받을 수 있음).
const MANIFEST_URL = "https://github.com/thkim0515/my-budget-app/releases/download/ota/latest.json";

// 첫 화면이 오류 없이 그려진 뒤 호출 — 새 번들이 정상 기동했음을 알려 롤백을 막는다.
// appReadyTimeout(10초) 안에 못 부르면(첫 화면에서 죽는 번들) 플러그인이 이전 번들로 되돌린다.
let appReadySent = false;
export function markAppReady() {
  if (appReadySent || !Capacitor.isNativePlatform()) return;
  appReadySent = true;
  CapacitorUpdater.notifyAppReady().catch(() => {});
}

const TIMEOUT = Symbol("timeout");
function withTimeout(p, ms) {
  return Promise.race([p, new Promise((r) => setTimeout(() => r(TIMEOUT), ms))]);
}

// 최신 manifest — 네이티브 HTTP 로 받는다(CORS 대상이 아님). GitHub 은 릴리스 자산을 CDN 에
// 캐시하므로 매번 달라지는 쿼리(t)와 no-cache 헤더를 붙여 오래된 latest.json 을 받지 않게 한다.
async function fetchManifest() {
  const res = await CapacitorHttp.get({
    url: `${MANIFEST_URL}?t=${Date.now()}`,
    headers: { "Cache-Control": "no-cache" },
  });
  if (res.status !== 200) return null;
  const m = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  if (!m || typeof m.bundleNo !== "number" || !m.url || m.bundleNo <= BUNDLE_NO) return null;
  return m;
}

// 네이티브 호환 — 플러그인 추가 등 네이티브가 바뀐 번들은 versionCode 를 올려 배포하므로
// 설치된 APK 가 그보다 낮으면 웹 번들만 바꿔서는 안 된다(새 APK 필요).
async function nativeCompatible(m) {
  const info = await CapApp.getInfo();
  return (Number(info.build) || 0) >= (m.minNativeBuild || 0);
}

// 받아서 압축까지 풀린 번들은 'pending'(아직 안 띄움), 띄워서 notifyAppReady 까지 된 건 'success'.
const READY_STATUSES = new Set(["pending", "success"]);

// download() 는 내려받기가 끝나는 순간 돌려주고, 압축 해제·체크섬 검사는 그 뒤 네이티브에서
// 따로 끝난다 — 압축이 다 풀릴 때까지 상태를 확인하며 기다린다.
async function waitUntilReady(id, timeoutMs) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    const { bundles } = await CapacitorUpdater.list();
    const b = bundles.find((x) => x.id === id);
    if (b && READY_STATUSES.has(b.status)) return b;
    if (b && b.status === "error") return null;
    await new Promise((r) => setTimeout(r, 150));
  }
  return null;
}

// 번들 받기 — 같은 버전을 동시에 두 번 받지 않게 진행 중인 다운로드를 공유한다.
// 이미 한 번 실패(롤백)한 버전이면 null — 받고·죽고·롤백하는 반복을 막는다.
const inFlight = new Map();
function getBundle(m) {
  const version = String(m.bundleNo);
  const running = inFlight.get(version);
  if (running) return running;
  const p = (async () => {
    const { bundles } = await CapacitorUpdater.list();
    if (bundles.some((b) => b.version === version && b.status === "error")) return null;
    const done = bundles.find((b) => b.version === version && READY_STATUSES.has(b.status));
    if (done) return done;
    const downloaded = await CapacitorUpdater.download({ url: m.url, version, checksum: m.checksum });
    return waitUntilReady(downloaded.id, 5000);
  })().finally(() => inFlight.delete(version));
  inFlight.set(version, p);
  return p;
}

// ── 앱을 켤 때: 새 번들이 있으면 바로 받아서 즉시 적용 ──────────────────────────
// 확인이 MANIFEST_TIMEOUT, 다운로드가 DOWNLOAD_TIMEOUT 을 넘거나 실패하면 지금 버전으로 그냥
// 들어가고, 받던 것은 끝나는 대로 next() 로 걸어 다음 백그라운드/재시작 때 적용한다.
const MANIFEST_TIMEOUT = 4000;
const DOWNLOAD_TIMEOUT = 10000;

export async function startupUpdate(hooks) {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const m = await withTimeout(fetchManifest(), MANIFEST_TIMEOUT);
    if (m === TIMEOUT || !m || !(await nativeCompatible(m))) return;

    hooks.onUpdating(`${m.version} (${m.bundleNo})`);
    const listener = await CapacitorUpdater.addListener("download", (e) => hooks.onProgress(e.percent));
    const pending = getBundle(m);
    const result = await withTimeout(pending, DOWNLOAD_TIMEOUT).catch(() => null);
    listener.remove().catch(() => {});

    if (result === TIMEOUT) {
      // 느린 네트워크 — 지금은 그냥 들어가고, 다 받으면 다음 백그라운드/재시작 때 적용
      pending.then((b) => b && CapacitorUpdater.next({ id: b.id })).catch(() => {});
      return;
    }
    if (!result) return;
    hooks.onProgress(100);
    // 즉시 새 번들로 재시작 — 이후 코드는 실행되지 않는다. 새 번들이 notifyAppReady() 를
    // 못 부르면 appReadyTimeout 뒤 이전 번들로 자동 롤백된다.
    await CapacitorUpdater.set({ id: result.id });
  } catch (e) {
    console.warn("[ota] startup update failed", e);
  }
}

// ── 앱을 쓰는 중(다시 앞으로 올 때): 받아 두었다가 다음 백그라운드/재시작 때 적용 ─────
let checking = false;

export async function checkForOtaUpdate() {
  if (!Capacitor.isNativePlatform() || checking) return { status: "none" };
  checking = true;
  try {
    const m = await fetchManifest();
    if (!m) return { status: "none" };
    if (!(await nativeCompatible(m))) return { status: "native-required", version: m.version };

    const bundle = await getBundle(m);
    if (!bundle) return { status: "none" };
    await CapacitorUpdater.next({ id: bundle.id });
    return { status: "ready", version: m.version };
  } catch (e) {
    console.warn("[ota] update check failed", e);
    return { status: "none" };
  } finally {
    checking = false;
  }
}
