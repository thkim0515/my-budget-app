import { useEffect, useRef, useState, useCallback } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import { useSettings } from "../context/SettingsContext"; // Context 훅 임포트
import {
  isNativePlatform,
  isBiometricAvailable,
  verifyBiometric,
} from "../services/biometricService";

export default function useBiometricLock() {
  const { settings } = useSettings(); // 중앙 설정값 가져오기
  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  const isAuthenticatingRef = useRef(false);
  const lastAuthTime = useRef(0);

  // 생체 인증 실행 함수
  const authenticate = useCallback(async () => {
    if (isAuthenticatingRef.current) return;

    isAuthenticatingRef.current = true;
    try {
      const available = await isBiometricAvailable();
      if (!available) {
        setIsLocked(false);
        return;
      }

      await verifyBiometric();
      setIsLocked(false);
      lastAuthTime.current = Date.now();
    } catch (error) {
      console.error("인증 실패:", error);
      setIsLocked(true);
    } finally {
      isAuthenticatingRef.current = false;
    }
  }, []);

  // 앱 최초 실행 시
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
  }, [authenticate, settings.useBiometric]); // 설정이 바뀌면 재판단

  // 앱 상태 변경 시 (Background -> Foreground)
  useEffect(() => {
    if (!isNativePlatform()) return;

    const listener = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      // 인증한지 1초 이내라면 무시 (중복 팝업 방지)
      if (Date.now() - lastAuthTime.current < 1000) return;

      // 잠금 설정이 되어있고, 현재 잠긴 상태일 때만 인증 시도
      if (isActive && settings.useBiometric && isLocked) {
        authenticate();
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [isLocked, authenticate, settings.useBiometric]); // 의존성 추가

  return {
    isLocked,
    isChecking,
    authenticate,
  };
}