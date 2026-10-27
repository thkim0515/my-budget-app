import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { startupUpdate, checkForOtaUpdate, markAppReady } from "../services/ota";
import { checkApkUpdate, dismissUpdate, APP_KEY } from "../services/appUpdate";
import { AppHub } from "../plugins/AppHub";

// 첫 화면이 오류 없이 그려졌다는 신호 — 화면과 같은 트리 안에 두어, 그 화면이 실제로 그려졌을 때만
// 커밋된다. 그때 "이 번들 정상"(notifyAppReady)을 보낸다. 첫 화면에서 죽는 번들이면 신호가 안 가서
// appReadyTimeout 뒤 이전 번들로 자동으로 되돌아간다.
export function ReadySignal() {
  useEffect(() => {
    markAppReady();
  }, []);
  return null;
}

// 앱을 켤 때 OTA 업데이트 — 평소엔 확인을 기다리지 않고 앱을 바로 띄우고, 새 번들이 있을
// 때만 "업데이트 중..." 화면을 덮어 받은 뒤 즉시 새 번들로 재시작한다.
// 시간 초과·실패면 덮개를 걷고 지금 버전으로 계속 쓴다(받던 건 다음 백그라운드/재시작 때 적용).
// 쓰는 중에는 앱이 앞으로 올 때(30분 간격) 새 번들을 받아 두었다가 다음 백그라운드/재시작 때 적용한다.
// 새 APK(네이티브가 바뀐 버전)가 있으면 앱 허브에서 받도록 안내창을 띄운다(UpdatePrompt).
// 앱 테마(localStorage themeMode)를 따라가 다크 모드에서 흰 화면이 번쩍이지 않게 한다.
function overlayColors() {
  let dark = false;
  try {
    dark = localStorage.getItem("themeMode") === "dark";
  } catch {
    /* 저장소 접근 불가면 라이트 */
  }
  return dark
    ? { bg: "#121212", text: "#e5e5e5", sub: "#8a8a8a", track: "#2a2a2a" }
    : { bg: "#ffffff", text: "#1f2937", sub: "#9ca3af", track: "#f3f4f6" };
}

export default function OtaGate({ children }) {
  const [updating, setUpdating] = useState(null);
  const [percent, setPercent] = useState(0);
  const [apkUpdate, setApkUpdate] = useState(null);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const checkApk = () => checkApkUpdate().then((u) => u && setApkUpdate(u));
    startupUpdate({
      onUpdating: (v) => setUpdating(v),
      onProgress: (p) => setPercent(Math.max(0, Math.min(100, Math.round(p)))),
    }).finally(() => {
      setUpdating(null);
      checkApk();
    });

    let lastCheck = Date.now();
    const listener = CapApp.addListener("appStateChange", ({ isActive }) => {
      if (!isActive || Date.now() - lastCheck < 30 * 60_000) return;
      lastCheck = Date.now();
      checkForOtaUpdate();
      checkApk();
    });
    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  return (
    <>
      {children}
      {apkUpdate && !updating && (
        <UpdatePrompt
          update={apkUpdate}
          onLater={() => {
            dismissUpdate(apkUpdate.versionCode);
            setApkUpdate(null);
          }}
        />
      )}
      {updating && (() => {
        const c = overlayColors();
        return (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: c.bg,
            color: c.text,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 40px",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 700 }}>업데이트 중...</div>
          <div style={{ fontSize: 12, color: c.sub, marginTop: 4 }}>{updating} 으로 업데이트하고 있어요</div>
          <div style={{ width: "100%", maxWidth: 220, height: 8, background: c.track, borderRadius: 999, marginTop: 20, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(percent, 3)}%`, background: "#3b82f6", borderRadius: 999, transition: "width 0.2s ease-out" }} />
          </div>
          <div style={{ fontSize: 11, color: c.sub, marginTop: 8 }}>{percent}%</div>
        </div>
        );
      })()}
    </>
  );
}

// 새 APK 안내창 — 업데이트는 앱 허브에서 받는다(OPEN_APP 인텐트로 이 앱의 업데이트 화면을 바로 연다).
// 강제(force)면 "나중에"가 없다. 단, 허브가 설치돼 있지 않으면 받을 방법이 없어 닫을 수 있게 둔다(다음 실행 때 다시 안내).
function UpdatePrompt({ update, onLater }) {
  const [hub, setHub] = useState(null); // null = 확인 중
  const [opening, setOpening] = useState(false);
  const c = overlayColors();

  useEffect(() => {
    AppHub.isInstalled()
      .then((r) => setHub(!!(r && r.installed)))
      .catch(() => setHub(false));
  }, []);

  const openHub = async () => {
    setOpening(true);
    try {
      const r = await AppHub.openUpdate({ appKey: APP_KEY });
      if (!r || r.result === "failed") alert("앱 허브를 열지 못했어요. 앱 허브가 설치되어 있는지 확인해 주세요.");
    } catch {
      alert("앱 허브를 열지 못했어요. 앱 허브가 설치되어 있는지 확인해 주세요.");
    } finally {
      setOpening(false);
    }
  };

  const canLater = !update.force || hub === false;
  const btn = { flex: 1, height: 46, borderRadius: 12, border: "none", fontSize: 15, fontWeight: 700, cursor: "pointer" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "0 24px" }}>
      <div role="dialog" aria-modal="true" style={{ width: "100%", maxWidth: 340, background: c.bg, color: c.text, borderRadius: 18, padding: "22px 20px 18px", boxShadow: "0 10px 40px rgba(0,0,0,0.25)" }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{update.force ? "업데이트가 필요해요" : "새 버전이 있어요"}</div>
        <div style={{ fontSize: 13, color: c.sub, marginTop: 6 }}>
          v{update.versionName} {update.force ? "으로 업데이트해야 계속 사용할 수 있어요." : "으로 업데이트할 수 있어요."}
        </div>
        {update.notes && (
          <div style={{ fontSize: 13, marginTop: 12, padding: "10px 12px", background: c.track, borderRadius: 10, whiteSpace: "pre-line", maxHeight: 160, overflowY: "auto" }}>
            {update.notes}
          </div>
        )}
        {hub === false && (
          <div style={{ fontSize: 12.5, color: "#e11d48", marginTop: 12 }}>앱 허브가 설치되어 있지 않아요. 앱 허브를 설치한 뒤 업데이트해 주세요.</div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          {canLater && (
            <button type="button" onClick={onLater} style={{ ...btn, background: c.track, color: c.text }}>
              {hub === false ? "닫기" : "나중에"}
            </button>
          )}
          {hub !== false && (
            <button type="button" disabled={hub === null || opening} onClick={openHub} style={{ ...btn, background: "#3b82f6", color: "#fff", opacity: hub === null || opening ? 0.6 : 1 }}>
              앱 허브에서 업데이트
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
