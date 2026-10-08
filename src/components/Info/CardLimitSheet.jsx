import { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useTheme } from "styled-components";
import { useSettings } from "../../context/SettingsContext";
import { pushBackHandler } from "../../utils/backHandlerStack";
import CardLimitPanel from "./CardLimitPanel";

// 홈의 카드 한도 영역을 눌렀을 때 열리는 바텀시트 — 카드사·한도 설정과 남은 한도 조정을 한 곳에서 한다.
// 안드로이드 뒤로가기로 닫히고, 아래쪽은 제스처 바 영역(safe-area)만큼 비워 둔다.
export default function CardLimitSheet({ open, onClose, usage }) {
  const theme = useTheme();
  const { settings } = useSettings();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    return pushBackHandler(() => closeRef.current());
  }, [open]);

  if (!open) return null;

  return ReactDOM.createPortal(
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300,
      }}
    >
      <div
        role="dialog"
        aria-label="카드 한도 설정"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480, maxHeight: "88vh",
          display: "flex", flexDirection: "column",
          background: theme.card, color: theme.text,
          border: `1px solid ${theme.border}`, borderBottom: "none",
          borderTopLeftRadius: 20, borderTopRightRadius: 20,
          boxSizing: "border-box", overflow: "hidden",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: theme.borderStrong || theme.border, margin: "10px auto 0", flexShrink: 0 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 18px 6px", flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>
            {settings.cardLimitProvider ? `${settings.cardLimitProvider} 한도` : "카드 한도 설정"}
          </h3>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            style={{ width: 44, height: 44, margin: "-8px -12px -8px 0", border: "none", background: "transparent", color: theme.subText, fontSize: 22, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
        <div
          style={{
            overflowY: "auto", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain",
            padding: "0 18px calc(20px + env(safe-area-inset-bottom))",
          }}
        >
          <CardLimitPanel usage={usage} onDone={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
