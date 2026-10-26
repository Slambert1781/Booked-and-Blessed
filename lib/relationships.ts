// Relationship tiers, Holiday Rush and the green / yellow / red verdict.
// Pure functions only, so the rules are easy to test and reuse.

import { formatMoney } from "@/lib/format";

export type Tier = "new_face" | "familiar" | "faithful" | "favored" | "highly_favored";

export const TIERS: Tier[] = ["new_face", "familiar", "faithful", "favored", "highly_favored"];

export const TIER_LABEL: Record<Tier, string> = {
  new_face: "New Face",
  familiar: "Familiar",
  faithful: "Faithful",
  favored: "Favored",
  highly_favored: "Highly Favored",
};

export const TIER_EXAMPLE: Record<Tier, string> = {
  new_face: "A stranger's wedding",
  familiar: "A church that calls twice a year",
  faithful: "A contractor who sends steady work",
  favored: "An orchestra that hires you every season",
  highly_favored: "Your main orchestra or best contractor",
};

/** % off the minimum hourly rate for each tier. */
export type TierDiscounts = Record<Tier, number>;

export const DEFAULT_TIER_DISCOUNTS: TierDiscounts = {
  new_face: 0,
  familiar: 10,
  faithful: 20,
  favored: 30,
  highly_favored: 40,
};

export const isTier = (v: unknown): v is Tier => typeof v === "string" && (TIERS as string[]).includes(v);

/** Read saved discounts, falling back to the defaults for anything missing or invalid. */
export function tierDiscountsFrom(raw: unknown): TierDiscounts {
  const out = { ...DEFAULT_TIER_DISCOUNTS };
  if (raw && typeof raw === "object") {
    for (const t of TIERS) {
      const v = Number((raw as Record<string, unknown>)[t]);
      if (Number.isFinite(v) && v >= 0 && v <= 100) out[t] = v;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Holiday Rush
// ---------------------------------------------------------------------------

/** A yearly date range, "MM-DD" to "MM-DD" inclusive. May wrap past New Year. */
export type RushPeriod = { label: string; start: string; end: string };

export const DEFAULT_RUSH_PERIODS: RushPeriod[] = [{ label: "Holiday season", start: "10-01", end: "12-31" }];

const MMDD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const isMonthDay = (v: string) => MMDD.test(v);

export function rushPeriodsFrom(raw: unknown): RushPeriod[] {
  if (!Array.isArray(raw)) return DEFAULT_RUSH_PERIODS;
  return raw
    .filter(
      (p): p is RushPeriod =>
        !!p && typeof p === "object" && isMonthDay(String(p.start)) && isMonthDay(String(p.end)),
    )
    .map((p) => ({ label: String(p.label ?? "").trim() || "Rush", start: p.start, end: p.end }));
}

/** Is "YYYY-MM-DD" inside the yearly range? */
export function inRushPeriod(date: string, p: RushPeriod): boolean {
  const md = date.slice(5, 10);
  return p.start <= p.end ? md >= p.start && md <= p.end : md >= p.start || md <= p.end;
}

/** The first rush period any of the dates falls in, or null. */
export function rushFor(dates: string[], periods: RushPeriod[], enabled: boolean): RushPeriod | null {
  if (!enabled) return null;
  for (const p of periods) if (dates.some((d) => inRushPeriod(d, p))) return p;
  return null;
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

export type Verdict = "green" | "yellow" | "red";

/** Yellow covers hourly rates up to this fraction below your minimum. */
export const YELLOW_BAND = 0.15;

export type VerdictInput = {
  /** Money after gas, lodging and food, before valuing drive time. */
  netCash: number;
  /** Union pension paid on your behalf; counts toward the verdict. */
  pension: number;
  /** Playing plus driving hours; 0 when service lengths are unknown. */
  totalHours: number;
  /** Your base minimum from the profile; null = no minimum set. */
  minHourlyRate: number | null;
  /** Null when the gig has no client: treated as a New Face. */
  client: { name: string; tier: Tier } | null;
  discounts: TierDiscounts;
  rush: RushPeriod | null;
};

/** During a Holiday Rush every client counts as one tier lower. */
export function rushTier(tier: Tier): Tier {
  return TIERS[Math.max(TIERS.indexOf(tier) - 1, 0)];
}

export type VerdictResult = {
  verdict: Verdict;
  /** Hourly rate used for the verdict (includes any union pension). */
  hourly: number | null;
  /** Your minimum for this gig after the tier discount (and any rush). */
  effectiveMin: number | null;
  /** Discount actually applied, in %. */
  discountPct: number;
  /** One or two plain sentences explaining the colour. */
  explanation: string;
};

const colourFor = (hourly: number, min: number): Verdict =>
  hourly >= min ? "green" : hourly >= min * (1 - YELLOW_BAND) ? "yellow" : "red";

const Cap = (v: Verdict) => v[0].toUpperCase() + v.slice(1);

/**
 * Green / yellow / red for a gig, or null when there's nothing to judge
 * (no minimum set, or no service lengths) and the gig doesn't lose money.
 */
export function judgeGig(i: VerdictInput): VerdictResult | null {
  const tier: Tier = i.client?.tier ?? "new_face";
  const baseDiscount = i.discounts[tier];
  const appliedTier = i.rush ? rushTier(tier) : tier;
  const discountPct = i.discounts[appliedTier];
  const hourly = i.totalHours > 0 ? (i.netCash + i.pension) / i.totalHours : null;

  // Hard floor: losing money is red whatever the relationship.
  if (i.netCash <= 0) {
    return {
      verdict: "red",
      hourly,
      effectiveMin: i.minHourlyRate === null ? null : i.minHourlyRate * (1 - discountPct / 100),
      discountPct,
      explanation: `Red: this gig loses ${formatMoney(-i.netCash)} after gas, lodging and food. No relationship tier makes paying to play worth it.`,
    };
  }
  if (hourly === null || i.minHourlyRate === null) return null;

  const effectiveMin = i.minHourlyRate * (1 - discountPct / 100);
  const verdict = colourFor(hourly, effectiveMin);

  const who = i.client ? i.client.name : "a client you haven't linked";
  const compare = verdict === "green" ? "above" : "below";
  let explanation =
    discountPct > 0
      ? `${Cap(verdict)}: ${formatMoney(hourly)}/hr is ${compare} ${formatMoney(effectiveMin)}/hr, your minimum for ${who} (${TIER_LABEL[appliedTier]}, ${round(discountPct)}% off ${formatMoney(i.minHourlyRate)}).`
      : `${Cap(verdict)}: ${formatMoney(hourly)}/hr is ${compare} your ${formatMoney(i.minHourlyRate)}/hr minimum${i.client ? ` (${i.client.name} is a ${TIER_LABEL[tier]}, so no discount)` : ""}.`;

  if (i.rush && appliedTier !== tier) {
    explanation += ` Holiday Rush (${i.rush.label}): ${i.client?.name ?? "this client"} counts as ${TIER_LABEL[appliedTier]} instead of ${TIER_LABEL[tier]}, so ${round(discountPct)}% off instead of ${round(baseDiscount)}%.`;
  }
  if (tier !== "new_face") {
    const asNewFace = colourFor(hourly, i.minHourlyRate);
    if (asNewFace !== verdict) explanation += ` For a New Face this would be ${asNewFace}.`;
  }
  if (i.pension > 0) explanation += ` Includes the ${formatMoney(i.pension)} union pension.`;

  return { verdict, hourly, effectiveMin, discountPct, explanation };
}

const round = (n: number) => Math.round(n * 10) / 10;
