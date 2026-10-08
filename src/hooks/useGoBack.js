import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

// 화면 상단 뒤로가기 버튼용 — 앱 안에서 쌓인 기록이 있으면 한 단계 뒤로(안드로이드 뒤로가기와 같음),
// 기록이 없으면(바로 이 화면으로 열린 경우) fallback 경로로 이동한다.
export default function useGoBack(fallback = "/") {
  const navigate = useNavigate();
  return useCallback(() => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, fallback]);
}
