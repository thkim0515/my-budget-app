import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";

// ── 새 APK 확인(앱 허브 배포) ─────────────────────────────────────────────────────
// 웹 화면은 OTA(ota.js)로 바뀌지만, 네이티브가 바뀐 버전은 새 APK 가 필요하다. 다른 앱들과 같이
// 업데이트 서버의 appLatest?app=mybudget 을 보고, 설치된 것보다 새 APK 가 있으면 앱 허브에서 받도록 안내한다.
// 강제 여부: 서버가 릴리스별 forceUpdate(0/1)로 정한 minVersionCode(강제 릴리스 중 가장 높은 번호)보다
// 설치본이 낮으면 강제 — "나중에" 없이 안내한다.

export const APP_KEY = "mybudget";
export const LATEST_URL = "https://asia-northeast3-our-days-f8384.cloudfunctions.net/appLatest?app=mybudget";

// 이번 실행에서 "나중에"를 누른 버전 — 같은 실행 중엔 다시 묻지 않고, 다음 실행 때 다시 묻는다.
let dismissedThisRun = 0;
export function dismissUpdate(versionCode) {
  dismissedThisRun = versionCode;
}

/** 안내할 업데이트(없으면 null). latest = 서버 latest.json, installedCode = 설치된 versionCode */
export function decideUpdate(latest, installedCode, dismissed = dismissedThisRun) {
  const code = Number(latest && latest.versionCode);
  if (!Number.isInteger(code) || code <= installedCode) return null;
  const force = installedCode < (Number(latest.minVersionCode) || 0);
  if (!force && code === dismissed) return null;
  return {
    versionCode: code,
    versionName: String(latest.versionName || ""),
    notes: String(latest.notes || "").trim(),
    force,
  };
}

// 앱을 처음 실행할 때 만든 무작위 기기 번호(개인정보 아님) — 서버가 앱별 설치 버전을 관리하는 데 쓴다.
function deviceId() {
  try {
    let id = localStorage.getItem("appDeviceId");
    if (!id && typeof crypto !== "undefined" && crypto.randomUUID) {
      id = crypto.randomUUID();
      localStorage.setItem("appDeviceId", id);
    }
    return id || "";
  } catch {
    return "";
  }
}

export async function checkApkUpdate() {
  if (!Capacitor.isNativePlatform()) return null;
  try {
    const info = await CapApp.getInfo();
    const vc = Number(info.build) || 0;
    const vn = String(info.version || "");
    let q = `&t=${Date.now()}`;
    const did = deviceId();
    if (did && /^[0-9A-Za-z._-]{1,32}$/.test(vn)) q += `&vc=${vc}&vn=${encodeURIComponent(vn)}&did=${did}`;
    const res = await CapacitorHttp.get({ url: LATEST_URL + q, headers: { "Cache-Control": "no-cache" } });
    if (res.status !== 200) return null;
    const m = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
    return decideUpdate(m, vc);
  } catch (e) {
    console.warn("[apk] update check failed", e);
    return null;
  }
}
