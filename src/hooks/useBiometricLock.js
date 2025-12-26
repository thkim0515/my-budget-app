// hooks/useBiometricLock.js
import { useEffect, useRef, useState, useCallback } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import {
  isNativePlatform,
  isBiometricAvailable,
  verifyBiometric,
} from "../services/biometricService";

export default function useBiometricLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  
  // 가드 역할은 ref로 관리 (무한 루프 방지 핵심)
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
  }, []); // 의존성 배열을 비워서 함수의 참조값을 고정합니다.

  // 앱 최초 실행 시
  useEffect(() => {
    if (!isNativePlatform()) {
      setIsLocked(false);
      setIsChecking(false);
      return;
    }

    const useBiometric = localStorage.getItem("useBiometric") === "true";

    if (useBiometric) {
      setIsLocked(true);
      authenticate();
    } else {
      setIsLocked(false);
    }

    setIsChecking(false);
  }, [authenticate]); // 이제 authenticate가 고정되어 있어 한 번만 실행됩니다.

  // 앱 상태 변경 시 (Background -> Foreground)
  useEffect(() => {
    if (!isNativePlatform()) return;

    const listener = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      // 인증한지 1초 이내라면 무시 (중복 팝업 방지)
      if (Date.now() - lastAuthTime.current < 1000) return;

      const useBiometric = localStorage.getItem("useBiometric") === "true";

      // 잠금 설정이 되어있고, 현재 잠긴 상태일 때만 인증 시도
      if (isActive && useBiometric && isLocked) {
        authenticate();
      }
    });

    return () => {
      listener.then(l => l.remove()); // Capacitor 리스너 제거 방식 대응
    };
  }, [isLocked, authenticate]);

  return {
    isLocked,
    isChecking,
    authenticate,
  };
}