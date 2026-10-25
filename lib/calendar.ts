// Month grid helpers. Dates are plain "YYYY-MM-DD" strings throughout, so
// there are no timezone surprises.

export type Month = { year: number; month: number }; // month is 1-12

const pad = (n: number) => String(n).padStart(2, "0");
export const isoDate = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
export const monthKey = ({ year, month }: Month) => `${year}-${pad(month)}`;

/** "2026-11" -> { year: 2026, month: 11 }; anything else -> fallback. */
export function parseMonth(value: string | undefined, fallback: Month): Month {
  const m = /^(\d{4})-(\d{2})$/.exec(value ?? "");
  if (!m) return fallback;
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? { year: Number(m[1]), month } : fallback;
}

export function addMonths({ year, month }: Month, delta: number): Month {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

/**
 * Weeks (Sunday first) covering the month. Days outside the month are null.
 */
export function monthGrid({ year, month }: Month): (string | null)[][] {
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => isoDate(year, month, i + 1)),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
