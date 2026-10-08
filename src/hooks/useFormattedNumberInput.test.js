import { useState } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { useFormattedNumberInput } from "./useFormattedNumberInput";
import { formatNumber } from "../utils/numberFormat";

// 한도 입력칸과 같은 구성(원본 숫자만 상태로 두고 표시할 때 콤마를 붙임)
function Field({ allowDecimal = false, max = null, initial = "" }) {
  const [raw, setRaw] = useState(initial);
  const input = useFormattedNumberInput({ onChange: (f) => setRaw(f.replace(/,/g, "")), allowDecimal, max });
  return <input aria-label="amt" value={raw ? formatNumber(raw) : ""} onChange={input.onChange} />;
}

function setup(initial, opts) {
  render(<Field initial={initial} {...opts} />);
  const el = screen.getByLabelText("amt");
  return el;
}

// jsdom 은 change 이벤트의 target.selectionStart 를 직접 못 넣으므로, value 를 바꾼 뒤 커서를 지정한다.
function typeAt(el, nextValue, caret) {
  el.focus();
  const proto = Object.getPrototypeOf(el);
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, nextValue);
  el.setSelectionRange(caret, caret);
  fireEvent.input(el);
}

test("중간 숫자를 지워도 커서가 끝으로 튀지 않는다", () => {
  const el = setup("1234567");
  expect(el.value).toBe("1,234,567");
  // "1,234,567" 에서 '3' 뒤(인덱스 4)에 커서를 두고 백스페이스 → "1,24,567", 커서 3
  typeAt(el, "1,24,567", 3);
  expect(el.value).toBe("124,567");
  // 숫자 "12" 뒤 = "12|4,567" → 인덱스 2
  expect(el.selectionStart).toBe(2);
});

test("중간에 숫자를 넣으면 커서가 넣은 숫자 뒤에 남는다", () => {
  const el = setup("1234");
  expect(el.value).toBe("1,234");
  // "1,2|34" 에 '9' 입력 → "1,294|..." 가 아니라 "1,29|34"
  typeAt(el, "1,2934", 4);
  expect(el.value).toBe("12,934");
  expect(el.selectionStart).toBe(4); // "12,9|34"
});

test("콤마를 지워도 커서가 끝으로 튀지 않는다", () => {
  const el = setup("1234567");
  // "1,|234,567" 에서 백스페이스로 콤마 삭제 → "1234,567", 커서 1
  typeAt(el, "1234,567", 1);
  expect(el.value).toBe("1,234,567");
  expect(el.selectionStart).toBe(1);
});

test("맨 뒤에 입력하면 커서는 계속 맨 뒤", () => {
  const el = setup("999");
  typeAt(el, "9999", 4);
  expect(el.value).toBe("9,999");
  expect(el.selectionStart).toBe(5);
});

test("전부 지우면 빈 값", () => {
  const el = setup("5");
  typeAt(el, "", 0);
  expect(el.value).toBe("");
});

test("최댓값을 넘는 입력은 무시한다", () => {
  const el = setup("999999999", { max: 1_000_000_000 });
  typeAt(el, "9,999,999,990", 13);
  expect(el.value).toBe("999,999,999");
});

test("소수점 허용 모드에서 소수점은 유지되고 두 번째 점은 무시된다", () => {
  const el = setup("", { allowDecimal: true });
  typeAt(el, "12.5", 4);
  expect(el.value).toBe("12.5");
  typeAt(el, "12.5.", 5);
  expect(el.value).toBe("12.5");
});
