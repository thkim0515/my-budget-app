import { useLayoutEffect, useRef, useState } from "react";
import { formatNumber } from "../utils/numberFormat";

// 천 단위 콤마가 붙는 금액 입력칸용 훅 — 값을 다시 포맷해도 커서가 입력하던 자리에 남게 한다.
//
// 문제: 값이 바뀌면 React 가 input 값을 통째로 다시 써서 커서가 맨 끝으로 튄다(중간 숫자를 지우면 끝으로 이동).
// 해결: 입력 직후 "커서 앞의 숫자 개수"를 세어 두고, 재포맷된 값이 DOM 에 반영된 직후(useLayoutEffect,
//       화면에 그려지기 전) 같은 개수의 숫자 뒤로 커서를 되돌린다.
//       콤마만 지운 경우처럼 상태가 안 바뀌는 때도 다시 그려지도록 매번 강제 렌더한다.
//
// onChange(formatted) 에는 콤마가 포함된 문자열이 넘어온다. 원본 숫자 문자열로 저장하려면
// 받은 쪽에서 콤마를 제거하면 된다. max 를 넘는 입력은 무시한다(커서만 원래 자리 근처로 유지).
export function useFormattedNumberInput({ onChange, allowDecimal = false, max = null }) {
  const inputRef = useRef(null);
  const pendingDigits = useRef(null); // 커서 앞에 있어야 할 숫자 개수
  const [, force] = useState(0);

  useLayoutEffect(() => {
    const input = inputRef.current;
    if (pendingDigits.current === null || !input) return;
    const digits = pendingDigits.current;
    pendingDigits.current = null;
    // 포커스가 없는 입력칸에 setSelectionRange 를 하면 키보드가 올라올 수 있어 포커스 상태일 때만 복구한다.
    if (document.activeElement !== input) return;
    const text = input.value;
    let pos = 0;
    if (digits > 0) {
      pos = text.length;
      let count = 0;
      for (let i = 0; i < text.length; i++) {
        if (/[0-9.]/.test(text[i])) count++;
        if (count === digits) {
          pos = i + 1;
          break;
        }
      }
    }
    try {
      input.setSelectionRange(pos, pos);
    } catch {
      /* 일부 입력 형식은 선택 범위를 지원하지 않는다 */
    }
  });

  const handleChange = (e) => {
    const input = e.target;
    inputRef.current = input;
    const rawValue = input.value;
    const cursor = input.selectionStart ?? rawValue.length;
    const keep = allowDecimal ? /[^0-9.]/g : /[^0-9]/g;

    const digitsBefore = rawValue.slice(0, cursor).replace(keep, "").length;
    let v = rawValue.replace(keep, "");
    if (allowDecimal) v = v.replace(/(\..*)\./g, "$1");

    if (max !== null && Number(v) > max) {
      // 거부 — React 가 이전 값으로 되돌리므로 방금 친 글자 하나만큼 앞으로 맞춘다.
      pendingDigits.current = Math.max(digitsBefore - 1, 0);
      force((n) => n + 1);
      return;
    }

    const formatted = v ? formatNumber(v) : "";
    pendingDigits.current = digitsBefore;
    onChange(formatted);
    force((n) => n + 1);
  };

  return { onChange: handleChange };
}
