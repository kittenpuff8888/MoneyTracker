// Pay-cycle aware "this month" range. The current period starts on the most
// recent occurrence of the user's pay day and runs to today.
// e.g. pay day = 25 and today = 7 Jul → 25 Jun … 7 Jul.
export function payPeriodRange(payDay: number | null | undefined, now: Date = new Date()) {
  const d = Math.min(Math.max(Math.round(Number(payDay) || 1), 1), 28);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start =
    today.getDate() >= d
      ? new Date(today.getFullYear(), today.getMonth(), d)
      : new Date(today.getFullYear(), today.getMonth() - 1, d);
  return { from: start, to: today };
}

export function ymd(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
