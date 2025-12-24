// hooks/useBiometricLock.js
import { useEffect, useRef, useState } from "react";
import { App as CapacitorApp } from "@capacitor/app";
import {
  isNativePlatform,
  isBiometricAvailable,
  verifyBiometric,
} from "../services/biometricService";

export default function useBiometricLock() {
  const [isLocked, setIsLocked] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const lastAuthTime = useRef(0);

  const authenticate = async () => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    try {
      const available = await isBiometricAvailable();
      if (!available) {
        setIsLocked(false);
        return;
      }
      await verifyBiometric();
      setIsLocked(false);
      lastAuthTime.current = Date.now();
    } catch {
      setIsLocked(true);
    } finally {
      setIsAuthenticating(false);
    }
  };

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
  }, []);

  useEffect(() => {
    if (!isNativePlatform()) return;

    const listener = CapacitorApp.addListener("appStateChange", ({ isActive }) => {
      if (Date.now() - lastAuthTime.current < 1000) return;
      const useBiometric = localStorage.getItem("useBiometric") === "true";

      if (isActive && useBiometric && isLocked && !isAuthenticating) {
        authenticate();
      }
    });

    return () => listener?.remove?.();
  }, [isLocked, isAuthenticating]);

  return {
    isLocked,
    isChecking,
    authenticate,
  };
}
