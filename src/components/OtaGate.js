import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { startupUpdate, checkForOtaUpdate, markAppReady } from "../services/ota";

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

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    startupUpdate({
      onUpdating: (v) => setUpdating(v),
      onProgress: (p) => setPercent(Math.max(0, Math.min(100, Math.round(p)))),
    }).finally(() => setUpdating(null));

    let lastCheck = Date.now();
    const listener = CapApp.addListener("appStateChange", ({ isActive }) => {
      if (!isActive || Date.now() - lastCheck < 30 * 60_000) return;
      lastCheck = Date.now();
      checkForOtaUpdate();
    });
    return () => {
      listener.then((l) => l.remove());
    };
  }, []);

  return (
    <>
      {children}
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
