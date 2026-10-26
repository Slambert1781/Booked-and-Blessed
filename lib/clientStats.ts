import { resultForSavedGig, statusOf, type GigRow, type GigSettings, type ServiceRow } from "@/lib/gigs";

export type YearTotals = {
  year: number;
  services: number;
  gigs: number;
  pay: number;
  takeHome: number;
};

/**
 * What booked gigs were worth per calendar year. A gig whose services span
 * two years is split between them by number of services.
 */
export function bookedTotalsByYear(
  gigs: (GigRow & { gig_services: ServiceRow[] })[],
  settings?: GigSettings,
): YearTotals[] {
  const byYear = new Map<number, YearTotals & { gigIds: Set<string> }>();
  for (const g of gigs) {
    if (statusOf(g) !== "taken" || g.gig_services.length === 0) continue;
    const r = resultForSavedGig(g, g.gig_services, settings);
    const per = 1 / g.gig_services.length;
    for (const s of g.gig_services) {
      const year = Number(s.service_date.slice(0, 4));
      const t = byYear.get(year) ?? { year, services: 0, gigs: 0, pay: 0, takeHome: 0, gigIds: new Set<string>() };
      t.services += 1;
      t.pay += r.totalPay * per;
      t.takeHome += r.realTakeHome * per;
      t.gigIds.add(g.id);
      byYear.set(year, t);
    }
  }
  return [...byYear.values()]
    .map(({ gigIds, ...t }) => ({ ...t, gigs: gigIds.size }))
    .sort((a, b) => b.year - a.year);
}
