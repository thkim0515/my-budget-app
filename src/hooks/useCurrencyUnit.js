import { useState, useEffect } from "react";

export function useCurrencyUnit() {
  const [unit, setUnit] = useState(() => {
    return localStorage.getItem("currencyUnit") || "원";
  });

  useEffect(() => {
    localStorage.setItem("currencyUnit", unit);
  }, [unit]);

  return { unit, setUnit };
}
