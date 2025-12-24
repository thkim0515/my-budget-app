// hooks/useAndroidBackHandler.js
import { useEffect } from "react";
import { App as CapacitorApp } from "@capacitor/app";

const isNative = () => !!window.Capacitor?.isNativePlatform?.();

export default function useAndroidBackHandler() {
  useEffect(() => {
    if (!isNative()) return;

    let handler;

    const setup = async () => {
      handler = await CapacitorApp.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        }
      });
    };

    setup();
    return () => handler?.remove?.();
  }, []);
}
