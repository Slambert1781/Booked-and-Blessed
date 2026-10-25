const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export const formatMoney = (n: number) => money.format(n);

export function formatHours(hours: number) {
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} hr` : `${h} hr ${m} min`;
}

export const formatMiles = (miles: number) =>
  `${miles.toLocaleString("en-US", { maximumFractionDigits: 1 })} mi`;

/** "2026-11-05" -> "Thu, Nov 5" (no timezone shift). */
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = {}) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
    ...opts,
  });
}

/** "19:30:00" -> "7:30 PM" */
export function formatTime(t: string | null) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  return new Date(Date.UTC(2000, 0, 1, h, m)).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

export function formatDateRange(dates: string[]) {
  const sorted = [...new Set(dates)].sort();
  if (sorted.length === 0) return "";
  if (sorted.length === 1) return formatDate(sorted[0], { year: "numeric" });
  const first = formatDate(sorted[0], { weekday: undefined });
  const last = formatDate(sorted.at(-1)!, { weekday: undefined, year: "numeric" });
  return `${first} – ${last}`;
}
