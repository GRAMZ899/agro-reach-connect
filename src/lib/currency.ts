import { useEffect, useState } from "react";

export type Currency = "UGX" | "USD";
const KEY = "ara_currency";

export function useCurrency() {
  const [currency, setCurrency] = useState<Currency>("UGX");
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
    if (stored === "USD" || stored === "UGX") setCurrency(stored);
  }, []);
  const update = (c: Currency) => {
    setCurrency(c);
    if (typeof window !== "undefined") localStorage.setItem(KEY, c);
  };
  return { currency, setCurrency: update };
}

export function formatPrice(ugx: number, usd: number, currency: Currency) {
  if (currency === "USD") {
    return `$${Number(usd ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }
  return `UGX ${Number(ugx ?? 0).toLocaleString()}`;
}
