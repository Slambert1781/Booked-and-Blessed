// Relationship tiers, Holiday Rush and the green / yellow / red verdict.
// Pure functions only, so the rules are easy to test and reuse.

import { formatHours, formatMoney } from "@/lib/format";

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

/** Yellow covers a take-home up to this fraction short of what your time is worth. */
export const YELLOW_BAND = 0.15;

export type VerdictInput = {
  /** "Your real take-home": cash after gas, lodging, food and the tax set-aside. */
  cashTakeHome: number;
  /** Hours of rehearsing and performing; 0 when service lengths are unknown. */
  playingHours: number;
  /** Hours of driving that count (0 when the gig's drive time is switched off). */
  drivingHours: number;
  /** What an hour behind the wheel is worth (driving rate, else playing rate). */
  drivingRate: number;
  /** The playing rate: stands in for the minimum when none is set. */
  playingRate: number;
  /** Your minimum hourly rate from the profile; null = use the playing rate. */
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
  /** Your minimum for playing on this gig, after the tier discount (and any rush). */
  effectiveMin: number;
  /** Discount actually applied, in %. */
  discountPct: number;
  /** What your time on the gig is worth: playing at your minimum plus driving. */
  timeValue: number;
  playingValue: number;
  drivingValue: number;
  /** Take-home minus time value: positive means the gig pays more than your time is worth. */
  gap: number;
  /** One or two plain sentences explaining the colour. */
  explanation: string;
};

const colourFor = (gap: number, timeValue: number): Verdict =>
  gap >= 0 ? "green" : -gap <= timeValue * YELLOW_BAND ? "yellow" : "red";

const Cap = (v: Verdict) => v[0].toUpperCase() + v.slice(1);

/**
 * Green / yellow / red: does the cash you take home cover what your time is
 * worth? Time value = playing hours at your minimum for this client (after
 * the tier discount and any Holiday Rush) + counted driving hours at your
 * driving rate. Hard floor: a take-home of $0 or less is red whatever the
 * tier. Null when the service lengths are unknown (nothing to weigh).
 */
export function judgeGig(i: VerdictInput): VerdictResult | null {
  const tier: Tier = i.client?.tier ?? "new_face";
  const baseDiscount = i.discounts[tier];
  const appliedTier = i.rush ? rushTier(tier) : tier;
  const discountPct = i.discounts[appliedTier];
  const baseMin = i.minHourlyRate ?? i.playingRate;
  const effectiveMin = baseMin * (1 - discountPct / 100);
  const playingValue = i.playingHours * effectiveMin;
  const drivingValue = i.drivingHours * i.drivingRate;
  const timeValue = playingValue + drivingValue;
  const gap = i.cashTakeHome - timeValue;
  const base = { effectiveMin, discountPct, timeValue, playingValue, drivingValue, gap };

  // Hard floor: losing money is red whatever the relationship.
  if (i.cashTakeHome <= 0) {
    return {
      ...base,
      verdict: "red",
      explanation: `Red: you'd ${i.cashTakeHome < 0 ? `lose ${formatMoney(-i.cashTakeHome)}` : "take home nothing"} after gas, lodging, food and taxes. No relationship tier makes paying to play worth it.`,
    };
  }
  if (i.playingHours <= 0) return null;

  const verdict = colourFor(gap, timeValue);
  const who = i.client ? i.client.name : "a client you haven't linked";
  const minNote =
    discountPct > 0
      ? `${formatMoney(effectiveMin)}/hr, your minimum for ${who} (${TIER_LABEL[appliedTier]}, ${round(discountPct)}% off ${formatMoney(baseMin)})`
      : `${formatMoney(effectiveMin)}/hr, your ${i.minHourlyRate === null ? "playing rate" : "minimum"}`;
  const timeNote =
    `${formatHours(i.playingHours)} playing at ${minNote}` +
    (i.drivingHours > 0 ? `, plus ${formatHours(i.drivingHours)} driving at ${formatMoney(i.drivingRate)}/hr` : "");

  let explanation =
    gap >= 0
      ? `${Cap(verdict)}: you take home ${formatMoney(gap)} more than your time is worth (${formatMoney(timeValue)}: ${timeNote}).`
      : `${Cap(verdict)}: you take home ${formatMoney(-gap)} less than your time is worth (${formatMoney(timeValue)}: ${timeNote}).`;

  if (i.rush && appliedTier !== tier) {
    explanation += ` Holiday Rush (${i.rush.label}): ${i.client?.name ?? "this client"} counts as ${TIER_LABEL[appliedTier]} instead of ${TIER_LABEL[tier]}, so ${round(discountPct)}% off instead of ${round(baseDiscount)}%.`;
  }
  if (tier !== "new_face") {
    const newFaceValue = i.playingHours * baseMin + drivingValue;
    const asNewFace = colourFor(i.cashTakeHome - newFaceValue, newFaceValue);
    if (asNewFace !== verdict) explanation += ` For a New Face this would be ${asNewFace}.`;
  }

  return { ...base, verdict, explanation };
}

const round = (n: number) => Math.round(n * 10) / 10;
