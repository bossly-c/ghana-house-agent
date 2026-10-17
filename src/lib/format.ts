// src/lib/format.ts

/** Full price label — e.g. GH₵ 2,800 */
export function formatGHS(amount: number): string {
  return "GH₵ " + amount.toLocaleString("en-GH");
}

/** Short price for map markers — e.g. GH₵ 2.8K  GH₵ 1.2M */
export function shortGHS(amount: number): string {
  if (amount >= 1_000_000) {
    const v = amount / 1_000_000;
    return "GH₵ " + (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + "M";
  }
  if (amount >= 1_000) {
    const v = amount / 1_000;
    return "GH₵ " + (v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)) + "K";
  }
  return "GH₵ " + amount;
}

export function periodLabel(period: string): string {
  switch (period) {
    case "month": return "/month";
    case "year":  return "/year";
    default:      return "";
  }
}

export function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}