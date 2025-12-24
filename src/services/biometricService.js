// services/biometricService.js
import { NativeBiometric } from "@capgo/capacitor-native-biometric";

export const isNativePlatform = () =>
  !!window.Capacitor?.isNativePlatform?.();

export const isBiometricAvailable = async () => {
  if (!isNativePlatform()) return false;
  const result = await NativeBiometric.isAvailable();
  return result.isAvailable;
};

export const verifyBiometric = async () => {
  return NativeBiometric.verifyIdentity({
    reason: "앱 잠금 해제",
    title: "가계부 잠금 해제",
    subtitle: "지문 또는 얼굴 인증",
    description: "인증 후 앱을 사용할 수 있습니다.",
  });
};
