// hooks/useAndroidBackHandler.js
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { consumeBack } from "../utils/backHandlerStack";

const isNative = () => !!window.Capacitor?.isNativePlatform?.();

export default function useAndroidBackHandler() {
  useEffect(() => {
    if (!isNative()) return;

    let handler;

    const setup = async () => {
      handler = await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        // 열려 있는 모달/바텀시트가 있으면 뒤로가기를 먼저 소비(닫기)하고 네비게이션은 막는다.
        if (consumeBack()) return;
        if (canGoBack) {
          window.history.back();
        }
      });
    };

    setup();
    return () => handler?.remove?.();
  }, []);
}
