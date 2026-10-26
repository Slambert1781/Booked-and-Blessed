import { describe, expect, it } from "vitest";
import {
  DEFAULT_TIER_DISCOUNTS,
  inRushPeriod,
  judgeGig,
  rushFor,
  rushPeriodsFrom,
  tierDiscountsFrom,
  type Tier,
  type VerdictInput,
} from "./relationships";

// $26/hr gig: $260 after gas over 10 hours, $40 minimum.
const base: VerdictInput = {
  netCash: 260,
  pension: 0,
  totalHours: 10,
  minHourlyRate: 40,
  client: null,
  discounts: DEFAULT_TIER_DISCOUNTS,
  rush: null,
};
const symphony = (tier: Tier) => ({ name: "Willamette Symphony", tier });

describe("judgeGig", () => {
  it("a New Face at $26/hr against $40 is red", () => {
    const v = judgeGig(base)!;
    expect(v.verdict).toBe("red");
    expect(v.effectiveMin).toBe(40);
    expect(v.explanation).toContain("below your $40.00/hr minimum");
  });

  it("the same gig is green for a Highly Favored client and explains why", () => {
    const v = judgeGig({ ...base, client: symphony("highly_favored") })!;
    expect(v.effectiveMin).toBeCloseTo(24);
    expect(v.verdict).toBe("green");
    expect(v.explanation).toContain("Willamette Symphony (Highly Favored, 40% off $40.00)");
    expect(v.explanation).toContain("For a New Face this would be red.");
  });

  it("yellow covers up to 15% below the minimum", () => {
    // Favored: $28 minimum; yellow down to $23.80.
    expect(judgeGig({ ...base, client: symphony("favored") })!.verdict).toBe("yellow");
    expect(judgeGig({ ...base, netCash: 238, client: symphony("favored") })!.verdict).toBe("yellow");
    expect(judgeGig({ ...base, netCash: 237, client: symphony("favored") })!.verdict).toBe("red");
  });

  it("hard floor: a gig that loses money is red for any tier", () => {
    const v = judgeGig({ ...base, netCash: -15, client: symphony("highly_favored") })!;
    expect(v.verdict).toBe("red");
    expect(v.explanation).toContain("loses $15.00");
  });

  it("losing money is red even with no minimum or hours set", () => {
    expect(judgeGig({ ...base, netCash: 0, minHourlyRate: null, totalHours: 0 })!.verdict).toBe("red");
  });

  it("no verdict without a minimum or without service lengths", () => {
    expect(judgeGig({ ...base, minHourlyRate: null })).toBeNull();
    expect(judgeGig({ ...base, totalHours: 0 })).toBeNull();
  });

  it("Holiday Rush makes the client count as one tier lower", () => {
    const rush = { label: "Holiday season", start: "10-01", end: "12-31" };
    const v = judgeGig({ ...base, client: symphony("highly_favored"), rush })!;
    expect(v.discountPct).toBe(30); // Favored
    expect(v.effectiveMin).toBeCloseTo(28);
    expect(v.verdict).toBe("yellow"); // $26 is within 15% of $28
    expect(v.explanation).toContain(
      "Holiday Rush (Holiday season): Willamette Symphony counts as Favored instead of Highly Favored, so 30% off instead of 40%.",
    );
  });

  it("a New Face stays a New Face in a rush", () => {
    const rush = { label: "Holiday season", start: "10-01", end: "12-31" };
    const v = judgeGig({ ...base, rush })!;
    expect(v.discountPct).toBe(0);
    expect(v.explanation).not.toContain("Holiday Rush");
  });

  it("union pension counts toward the verdict", () => {
    const v = judgeGig({ ...base, pension: 150 })!;
    expect(v.hourly).toBeCloseTo(41);
    expect(v.verdict).toBe("green");
    expect(v.explanation).toContain("Includes the $150.00 union pension.");
  });

  it("uses custom discounts", () => {
    const discounts = { ...DEFAULT_TIER_DISCOUNTS, familiar: 50 };
    expect(judgeGig({ ...base, discounts, client: symphony("familiar") })!.effectiveMin).toBe(20);
  });
});

describe("Holiday Rush periods", () => {
  it("matches dates inside a range, ignoring the year", () => {
    const p = { label: "Christmas", start: "12-01", end: "12-24" };
    expect(inRushPeriod("2026-12-19", p)).toBe(true);
    expect(inRushPeriod("2031-12-01", p)).toBe(true);
    expect(inRushPeriod("2026-12-25", p)).toBe(false);
    expect(inRushPeriod("2026-02-14", p)).toBe(false);
  });

  it("handles ranges that wrap past New Year", () => {
    const p = { label: "New Year", start: "12-28", end: "01-02" };
    expect(inRushPeriod("2026-12-31", p)).toBe(true);
    expect(inRushPeriod("2027-01-02", p)).toBe(true);
    expect(inRushPeriod("2027-01-03", p)).toBe(false);
  });

  it("a gig is in a rush if any service is", () => {
    const periods = [{ label: "Christmas", start: "12-01", end: "12-24" }];
    expect(rushFor(["2026-11-29", "2026-12-02"], periods, true)?.label).toBe("Christmas");
    expect(rushFor(["2026-11-29"], periods, true)).toBeNull();
    expect(rushFor(["2026-12-02"], periods, false)).toBeNull();
  });
});

describe("reading saved settings", () => {
  it("fills missing or invalid tier discounts with defaults", () => {
    expect(tierDiscountsFrom({ familiar: 15, faithful: "x", favored: 120 })).toEqual({
      ...DEFAULT_TIER_DISCOUNTS,
      familiar: 15,
    });
    expect(tierDiscountsFrom(null)).toEqual(DEFAULT_TIER_DISCOUNTS);
  });

  it("drops malformed rush periods", () => {
    expect(
      rushPeriodsFrom([
        { label: "June weddings", start: "06-01", end: "06-30" },
        { label: "bad", start: "13-01", end: "06-30" },
      ]),
    ).toEqual([{ label: "June weddings", start: "06-01", end: "06-30" }]);
  });
});

describe("default Holiday Rush", () => {
  it("is October through December", () => {
    const periods = rushPeriodsFrom(undefined);
    expect(periods).toEqual([{ label: "Holiday season", start: "10-01", end: "12-31" }]);
    expect(rushFor(["2026-10-01"], periods, true)).not.toBeNull();
    expect(rushFor(["2026-12-31"], periods, true)).not.toBeNull();
    expect(rushFor(["2026-09-30"], periods, true)).toBeNull();
    expect(rushFor(["2027-01-01"], periods, true)).toBeNull();
  });
});
