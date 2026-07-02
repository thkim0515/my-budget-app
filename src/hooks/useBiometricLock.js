import { useEffect, useRef, useState, useCallback } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { useSettings } from "../context/SettingsContext";
import {
  isNativePlatform,
  isBiometricAvailable,
  verifyBiometric,
} from "../services/biometricService";

export default function useBiometricLock() {
  const { settings } = useSettings();
  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [needsPinFallback, setNeedsPinFallback] = useState(false);

  const isAuthenticatingRef = useRef(false);
  const lastAuthTime = useRef(0);
  // 사용자가 명시적으로 취소했는지 추적 — appStateChange 루프 방지용
  const userCancelledRef = useRef(false);
  const needsPinFallbackRef = useRef(false);

  const setPin = (val) => {
    setNeedsPinFallback(val);
    needsPinFallbackRef.current = val;
  };

  const authenticate = useCallback(async () => {
    if (isAuthenticatingRef.current) return;

    userCancelledRef.current = false;
    isAuthenticatingRef.current = true;
    setPin(false);
    try {
      const available = await isBiometricAvailable();
      if (!available) {
        // 생체 인식 불가 → PIN 폴백
        setPin(true);
        return;
      }

      await verifyBiometric();
      setIsLocked(false);
      lastAuthTime.current = Date.now();
    } catch {
      // 취소 or 실패 → PIN 창으로 전환, appStateChange 루프 차단
      userCancelledRef.current = true;
      setPin(true);
    } finally {
      isAuthenticatingRef.current = false;
    }
  }, []);

  const verifyPin = useCallback(
    (pin) => {
      if (pin === settings.lockPin) {
        setIsLocked(false);
        setPin(false);
        userCancelledRef.current = false;
        lastAuthTime.current = Date.now();
        return true;
      }
      return false;
    },
    [settings.lockPin]
  );

  useEffect(() => {
    if (!isNativePlatform()) {
      setIsLocked(false);
      setIsChecking(false);
      return;
    }

    if (settings.useBiometric) {
      setIsLocked(true);
      authenticate();
    } else {
      setIsLocked(false);
    }

    setIsChecking(false);
  }, [authenticate, settings.useBiometric]);

  useEffect(() => {
    if (!isNativePlatform()) return;

    const listener = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (Date.now() - lastAuthTime.current < 1000) return;
      // 사용자가 취소해서 PIN 창이 떠 있는 상태면 자동 재시도하지 않음
      if (userCancelledRef.current || needsPinFallbackRef.current) return;

      if (isActive && settings.useBiometric && isLocked) {
        authenticate();
      }
    });

    return () => {
      listener.then((l) => l.remove());
    };
  }, [isLocked, authenticate, settings.useBiometric]);

  return {
    isLocked,
    isChecking,
    authenticate,
    needsPinFallback,
    verifyPin,
  };
}
