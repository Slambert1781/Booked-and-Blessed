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

// $260 take-home for 8 hours of playing and 2 hours of driving ($25/hr), $40 minimum.
const base: VerdictInput = {
  cashTakeHome: 260,
  playingHours: 8,
  drivingHours: 2,
  drivingRate: 25,
  playingRate: 50,
  minHourlyRate: 40,
  client: null,
  discounts: DEFAULT_TIER_DISCOUNTS,
  rush: null,
};
const symphony = (tier: Tier) => ({ name: "Willamette Symphony", tier });

describe("judgeGig: take-home vs what your time is worth", () => {
  it("time value = playing hours at your minimum + driving hours at your driving rate", () => {
    const v = judgeGig(base)!;
    expect(v.playingValue).toBe(320); // 8 x $40
    expect(v.drivingValue).toBe(50); // 2 x $25
    expect(v.timeValue).toBe(370);
    expect(v.gap).toBe(-110);
  });

  it("a New Face $110 short of $370 is red (more than 15% short)", () => {
    const v = judgeGig(base)!;
    expect(v.verdict).toBe("red");
    expect(v.explanation).toContain("you take home $110.00 less than your time is worth ($370.00");
  });

  it("the same gig is green for a Highly Favored client and explains why", () => {
    const v = judgeGig({ ...base, client: symphony("highly_favored") })!;
    expect(v.effectiveMin).toBeCloseTo(24);
    expect(v.timeValue).toBeCloseTo(242); // 8 x $24 + $50
    expect(v.verdict).toBe("green");
    expect(v.explanation).toContain("$18.00 more than your time is worth");
    expect(v.explanation).toContain("Willamette Symphony (Highly Favored, 40% off $40.00)");
    expect(v.explanation).toContain("For a New Face this would be red.");
  });

  it("yellow when short by no more than 15% of the time value", () => {
    // Favored: 8 x $28 + $50 = $274; $260 is $14 short, within $41.10.
    expect(judgeGig({ ...base, client: symphony("favored") })!.verdict).toBe("yellow");
    // Exactly 15% short is still yellow; any more is red.
    const tv = 274;
    expect(judgeGig({ ...base, cashTakeHome: tv * 0.85, client: symphony("favored") })!.verdict).toBe("yellow");
    expect(judgeGig({ ...base, cashTakeHome: tv * 0.85 - 1, client: symphony("favored") })!.verdict).toBe("red");
  });

  it("green when the take-home exactly covers your time", () => {
    expect(judgeGig({ ...base, cashTakeHome: 370 })!.verdict).toBe("green");
  });

  it("hard floor: a take-home of $0 or less is red for any tier", () => {
    const v = judgeGig({ ...base, cashTakeHome: -15, client: symphony("highly_favored") })!;
    expect(v.verdict).toBe("red");
    expect(v.explanation).toContain("lose $15.00");
    expect(judgeGig({ ...base, cashTakeHome: 0, playingHours: 0 })!.verdict).toBe("red");
  });

  it("no verdict without service lengths (nothing to weigh), unless it loses money", () => {
    expect(judgeGig({ ...base, playingHours: 0 })).toBeNull();
  });

  it("with no minimum set, playing time is valued at the playing rate", () => {
    const v = judgeGig({ ...base, minHourlyRate: null })!;
    expect(v.effectiveMin).toBe(50);
    expect(v.timeValue).toBe(450);
    expect(v.explanation).toContain("your playing rate");
  });

  it("driving that isn't counted adds nothing to the time value", () => {
    expect(judgeGig({ ...base, drivingHours: 0 })!.timeValue).toBe(320);
  });

  it("Holiday Rush makes the client count as one tier lower", () => {
    const rush = { label: "Holiday season", start: "10-01", end: "12-31" };
    const v = judgeGig({ ...base, client: symphony("highly_favored"), rush })!;
    expect(v.discountPct).toBe(30); // Favored
    expect(v.effectiveMin).toBeCloseTo(28);
    expect(v.verdict).toBe("yellow");
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
