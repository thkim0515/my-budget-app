import { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom";
import { useTheme } from "styled-components";
import { pushBackHandler } from "../../utils/backHandlerStack";

// 화면 가운데 뜨는 대화상자. 제목·한 줄 설명(ⓘ로 긴 설명)·스크롤 목록·하단 영역(footer). 높이는 화면의 70%까지, 목록만 스크롤된다.
export default function CenterDialog({ title, summary, info, footer, onClose, children }) {
  const theme = useTheme();
  const [showInfo, setShowInfo] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => pushBackHandler(() => closeRef.current()), []);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && closeRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return ReactDOM.createPortal(
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, boxSizing: "border-box", zIndex: 300 }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, maxHeight: "70vh", display: "flex", flexDirection: "column", boxSizing: "border-box", overflow: "hidden", background: theme.card, color: theme.text, border: `1px solid ${theme.border}`, borderRadius: 20, boxShadow: theme.shadowLg }}
      >
        <div style={{ padding: "16px 18px 8px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{title}</h3>
            {info && (
              <button
                type="button"
                aria-label="자세한 설명"
                aria-expanded={showInfo}
                onClick={() => setShowInfo(!showInfo)}
                style={{ width: 44, height: 44, margin: "-10px -10px -10px 0", border: "none", background: "transparent", color: showInfo ? theme.primaryText : theme.subText, fontSize: 18, cursor: "pointer" }}
              >
                ⓘ
              </button>
            )}
          </div>
          {summary && <div style={{ marginTop: 2, fontSize: 13, lineHeight: 1.45, color: theme.subText }}>{summary}</div>}
          {showInfo && <div style={{ marginTop: 8, padding: "10px 12px", borderRadius: 12, background: theme.cardAlt, fontSize: 12.5, lineHeight: 1.55, color: theme.subText }}>{info}</div>}
        </div>
        <div style={{ position: "relative", flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "4px 18px" }}>{children}</div>
        {footer && <div style={{ padding: "10px 18px calc(14px + env(safe-area-inset-bottom))", flexShrink: 0, borderTop: `1px solid ${theme.border}` }}>{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}
