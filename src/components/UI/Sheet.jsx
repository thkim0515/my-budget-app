import { useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { useTheme } from "styled-components";
import { pushBackHandler } from "../../utils/backHandlerStack";

// 바닥에서 올라오는 시트 — 카드 한도 시트와 같은 모양. 뒤로가기로 닫힌다.
export default function Sheet({ title, onClose, children }) {
  const theme = useTheme();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => pushBackHandler(() => closeRef.current()), []);

  return ReactDOM.createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 300 }}>
      <div
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480, maxHeight: "88vh", display: "flex", flexDirection: "column",
          background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, borderBottom: "none",
          borderTopLeftRadius: 20, borderTopRightRadius: 20, boxSizing: "border-box", overflow: "hidden",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: theme.borderStrong, margin: "10px auto 0", flexShrink: 0 }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 18px 6px", flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{title}</h3>
          <button type="button" aria-label="닫기" onClick={onClose} style={{ width: 44, height: 44, margin: "-8px -12px -8px 0", border: "none", background: "transparent", color: theme.subText, fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ overflowY: "auto", overflowX: "hidden", minWidth: 0, overscrollBehavior: "contain", padding: "6px 18px calc(20px + env(safe-area-inset-bottom))" }}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
