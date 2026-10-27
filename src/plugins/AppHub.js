import { registerPlugin } from "@capacitor/core";

// 앱 허브(com.thkim.apphub) 연동 — 네이티브 AppHubPlugin.java (v1.1.1, versionCode 3 부터 있음)
// isInstalled() → { installed }, openUpdate({ appKey }) → { result: "update" | "launcher" | "failed" }
export const AppHub = registerPlugin("AppHub");
