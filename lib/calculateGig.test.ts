import { describe, expect, it } from "vitest";
import { calculateGig, type CalcGig, type CalcLookups, type CalcProfile } from "./calculateGig";
import { FEDERAL_MEAL_RATES } from "./meals";

const profile: CalcProfile = { mpg: 25, playingRate: 50, drivingRate: null };
// 50 miles / 60 minutes each way -> 100 miles, 2 hours per round trip.
const lookups: CalcLookups = { oneWayMiles: 50, oneWayMinutes: 60, gasPricePerGallon: 3 };

const orchestra: CalcGig = {
  gigType: "orchestra",
  feePerService: 150,
  numberOfServices: 5,
  // 4 rehearsals + concert over 4 days (dress rehearsal and concert same day)
  serviceDates: ["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-05"],
  paysMileage: false,
  stayingOvernight: false,
  hosted: false,
};

const wedding: CalcGig = {
  gigType: "flat_fee",
  flatFee: 400,
  serviceDates: ["2026-11-14"],
  paysMileage: false,
  stayingOvernight: false,
  hosted: false,
};

describe("calculateGig", () => {
  it("orchestra gig: pays per service, one round trip per service day", () => {
    const r = calculateGig(profile, orchestra, lookups);
    expect(r.totalPay).toBe(750);
    expect(r.serviceDays).toBe(4);
    expect(r.roundTrips).toBe(4);
    expect(r.nights).toBe(0);
    expect(r.totalMiles).toBe(400);
    expect(r.totalDriveHours).toBe(8);
    expect(r.gasCost).toBeCloseTo(48); // 400 / 25 * 3
    expect(r.driveTimeCost).toBe(400); // 8h * $50
    expect(r.realTakeHome).toBeCloseTo(750 - 48 - 400);
  });

  it("flat-fee gig: pays the flat fee", () => {
    const r = calculateGig(profile, wedding, lookups);
    expect(r.totalPay).toBe(400);
    expect(r.roundTrips).toBe(1);
    expect(r.totalMiles).toBe(100);
    expect(r.gasCost).toBeCloseTo(12);
    expect(r.driveTimeCost).toBe(100);
    expect(r.realTakeHome).toBeCloseTo(288);
  });

  it("ignores the other gig type's fee fields", () => {
    const r = calculateGig(profile, { ...wedding, feePerService: 999, numberOfServices: 9 }, lookups);
    expect(r.totalPay).toBe(400);
  });

  it("staying overnight: one round trip, nights = service days - 1, room cost and stipend", () => {
    const r = calculateGig(
      profile,
      { ...orchestra, stayingOvernight: true, roomCostPerNight: 120, stipendPerNight: 40 },
      lookups,
    );
    expect(r.roundTrips).toBe(1);
    expect(r.nights).toBe(3);
    expect(r.totalMiles).toBe(100);
    expect(r.lodgingCost).toBe(360);
    expect(r.lodgingStipend).toBe(120);
    expect(r.realTakeHome).toBeCloseTo(750 + 120 - 12 - 360 - 100);
  });

  it("staying overnight for a single-day gig counts one night", () => {
    const r = calculateGig(profile, { ...wedding, stayingOvernight: true, roomCostPerNight: 100 }, lookups);
    expect(r.nights).toBe(1);
    expect(r.lodgingCost).toBe(100);
  });

  it("not staying overnight: no lodging cost or stipend even if amounts are filled in", () => {
    const r = calculateGig(profile, { ...orchestra, roomCostPerNight: 120, stipendPerNight: 40 }, lookups);
    expect(r.lodgingCost).toBe(0);
    expect(r.lodgingStipend).toBe(0);
  });

  it("hosted lodging: no room cost, but the stipend still counts", () => {
    const r = calculateGig(
      profile,
      { ...orchestra, stayingOvernight: true, hosted: true, roomCostPerNight: 120, stipendPerNight: 40 },
      lookups,
    );
    expect(r.lodgingCost).toBe(0);
    expect(r.lodgingStipend).toBe(120);
  });

  it("per-mile reimbursement uses total miles", () => {
    const r = calculateGig(
      profile,
      { ...orchestra, paysMileage: true, reimbType: "per_mile", reimbRatePerMile: 0.5 },
      lookups,
    );
    expect(r.mileageReimbursement).toBeCloseTo(200); // 400 miles * $0.50
    expect(r.realTakeHome).toBeCloseTo(750 + 200 - 48 - 400);
  });

  it("flat reimbursement uses the flat amount", () => {
    const r = calculateGig(
      profile,
      { ...orchestra, paysMileage: true, reimbType: "flat", flatReimbAmount: 75, reimbRatePerMile: 0.5 },
      lookups,
    );
    expect(r.mileageReimbursement).toBe(75);
  });

  it("no reimbursement when the orchestra doesn't pay mileage", () => {
    const r = calculateGig(
      profile,
      { ...orchestra, paysMileage: false, reimbType: "per_mile", reimbRatePerMile: 0.5 },
      lookups,
    );
    expect(r.mileageReimbursement).toBe(0);
  });

  it("driving rate set: drive time is valued at the driving rate", () => {
    const r = calculateGig({ ...profile, drivingRate: 20 }, orchestra, lookups);
    expect(r.driveTimeRate).toBe(20);
    expect(r.driveTimeCost).toBe(160); // 8h * $20
  });

  it("driving rate blank: drive time falls back to the playing rate", () => {
    const r = calculateGig({ ...profile, drivingRate: null }, orchestra, lookups);
    expect(r.driveTimeRate).toBe(50);
    expect(r.driveTimeCost).toBe(400);
  });

  it("a driving rate of zero is respected, not treated as blank", () => {
    const r = calculateGig({ ...profile, drivingRate: 0 }, orchestra, lookups);
    expect(r.driveTimeCost).toBe(0);
  });

  it("keeps full precision (no rounding inside the calculation)", () => {
    const r = calculateGig(
      { mpg: 23.7, playingRate: 45, drivingRate: null },
      wedding,
      { oneWayMiles: 37.3, oneWayMinutes: 41, gasPricePerGallon: 3.179 },
    );
    expect(r.gasCost).toBeCloseTo((74.6 / 23.7) * 3.179, 10);
    expect(r.driveTimeCost).toBeCloseTo((82 / 60) * 45, 10);
  });
});

describe("calculateGig: hourly rate, tax and union", () => {
  // Wedding: $400, one 2-hour service, 100 mi / 2 hr round trip, $12 gas.
  const withHours: CalcGig = { ...wedding, serviceHours: [2] };

  it("real hourly rate counts playing and driving time, before valuing drive time", () => {
    const r = calculateGig(profile, withHours, lookups);
    expect(r.playingHours).toBe(2);
    expect(r.totalHours).toBe(4);
    expect(r.netCash).toBeCloseTo(388);
    expect(r.realHourlyRate).toBeCloseTo(97);
  });

  it("adds up service lengths and ignores blanks", () => {
    const r = calculateGig(profile, { ...orchestra, serviceHours: [2.5, 2.5, null, 3, 2] }, lookups);
    expect(r.playingHours).toBe(10);
  });

  it("no service lengths means no hourly rate or verdict", () => {
    const r = calculateGig({ ...profile, minHourlyRate: 40 }, wedding, lookups);
    expect(r.realHourlyRate).toBeNull();
    expect(r.meetsMinimum).toBeNull();
  });

  it("compares against the minimum hourly rate", () => {
    expect(calculateGig({ ...profile, minHourlyRate: 90 }, withHours, lookups).meetsMinimum).toBe(true);
    expect(calculateGig({ ...profile, minHourlyRate: 100 }, withHours, lookups).meetsMinimum).toBe(false);
    expect(calculateGig(profile, withHours, lookups).meetsMinimum).toBeNull();
  });

  it("tax set-aside is a % of the pay and comes out of take-home", () => {
    const r = calculateGig({ ...profile, taxRatePct: 25 }, withHours, lookups);
    expect(r.taxSetAside).toBe(100);
    expect(r.takeHomeBeforeTax).toBeCloseTo(288);
    expect(r.realTakeHome).toBeCloseTo(188);
  });

  it("tax doesn't change the hourly rate (rates are quoted before tax)", () => {
    const withTax = calculateGig({ ...profile, taxRatePct: 25 }, withHours, lookups);
    const without = calculateGig(profile, withHours, lookups);
    expect(withTax.realHourlyRate).toBeCloseTo(without.realHourlyRate!);
  });

  it("lodging nights can be set by hand", () => {
    // One concert, but three nights away.
    const r = calculateGig(
      profile,
      { ...wedding, stayingOvernight: true, roomCostPerNight: 100, stipendPerNight: 20, lodgingNights: 3 },
      lookups,
    );
    expect(r.nights).toBe(3);
    expect(r.lodgingCost).toBe(300);
    expect(r.lodgingStipend).toBe(60);
    expect(r.roundTrips).toBe(1);
  });

  it("lodging nights are ignored when not staying overnight", () => {
    expect(calculateGig(profile, { ...wedding, lodgingNights: 3, roomCostPerNight: 100 }, lookups).nights).toBe(0);
  });

  it("union pension is a % of pay, only on union gigs, and not part of take-home", () => {
    const union = calculateGig(profile, { ...orchestra, isUnion: true, pensionPct: 10 }, lookups);
    expect(union.pensionContribution).toBe(75);
    expect(union.realTakeHome).toBeCloseTo(750 - 48 - 400);
    expect(calculateGig(profile, { ...orchestra, isUnion: false, pensionPct: 10 }, lookups).pensionContribution).toBe(0);
  });
});

describe("calculateGig: food", () => {
  const eater: CalcProfile = { ...profile, mealRates: FEDERAL_MEAL_RATES };
  const allMeals = { breakfast: true, lunch: true, dinner: true, incidentals: true };

  it("eating out off: no food cost", () => {
    const r = calculateGig(eater, { ...orchestra, eatingOut: false }, lookups);
    expect(r.foodCost).toBe(0);
    expect(r.realTakeHome).toBeCloseTo(750 - 48 - 400);
  });

  it("local gig across multiple service days: chosen meals for each service day", () => {
    // 5 services on 4 distinct days; lunch + dinner = $47 a day.
    const meals = { breakfast: false, lunch: true, dinner: true, incidentals: false };
    const r = calculateGig(eater, { ...orchestra, meals }, lookups);
    expect(r.foodDays).toBe(4);
    expect(r.foodRate).toBe(47);
    expect(r.foodCost).toBe(188);
    expect(r.realTakeHome).toBeCloseTo(750 - 48 - 188 - 400);
  });

  it("a local gig starts with dinner only", () => {
    const r = calculateGig(eater, orchestra, lookups);
    expect(r.meals).toEqual({ breakfast: false, lunch: false, dinner: true, incidentals: false });
    expect(r.foodCost).toBe(4 * 28);
  });

  it("overnight gig: nights + 1 days, all four meals by default (the $68 federal rate)", () => {
    // 4 service days -> 3 nights -> 4 days of meals.
    const r = calculateGig(eater, { ...orchestra, stayingOvernight: true, roomCostPerNight: 120 }, lookups);
    expect(r.nights).toBe(3);
    expect(r.meals).toEqual(allMeals);
    expect(r.foodCost).toBe(272); // 4 x $68
    expect(r.realTakeHome).toBeCloseTo(750 - 12 - 360 - 272 - 100);
  });

  it("overnight food follows a hand-set number of nights", () => {
    // One concert, three nights away -> four days of meals.
    const r = calculateGig(eater, { ...wedding, stayingOvernight: true, hosted: true, lodgingNights: 3 }, lookups);
    expect(r.foodCost).toBe(272);
  });

  it("uses your own meal prices", () => {
    const pricey: CalcProfile = { ...profile, mealRates: { breakfast: 12, lunch: 18, dinner: 40, incidentals: 0 } };
    const r = calculateGig(pricey, { ...wedding, meals: { ...allMeals, breakfast: false } }, lookups);
    expect(r.foodCost).toBe(58);
  });

  it("food counts toward the money behind the hourly rate", () => {
    const withFood = calculateGig(eater, { ...wedding, serviceHours: [2] }, lookups);
    expect(withFood.netCash).toBeCloseTo(400 - 12 - 28);
    expect(withFood.realHourlyRate).toBeCloseTo(360 / 4);
  });
});

describe("calculateGig: food stipend", () => {
  const eater: CalcProfile = { ...profile, mealRates: FEDERAL_MEAL_RATES };

  it("per day: paid for every day away and added to take-home", () => {
    const r = calculateGig(
      eater,
      { ...orchestra, stayingOvernight: true, foodStipend: { type: "per_day", amount: 50 } },
      lookups,
    );
    expect(r.foodStipend).toBe(200); // 4 days
    expect(r.realTakeHome).toBeCloseTo(750 + 200 - 12 - 272 - 100);
  });

  it("flat amount is paid once", () => {
    const r = calculateGig(eater, { ...orchestra, foodStipend: { type: "flat", amount: 75 } }, lookups);
    expect(r.foodStipend).toBe(75);
  });

  it("still paid when you're not eating out", () => {
    const r = calculateGig(
      eater,
      { ...orchestra, eatingOut: false, foodStipend: { type: "per_day", amount: 20 } },
      lookups,
    );
    expect(r.foodCost).toBe(0);
    expect(r.foodStipend).toBe(80); // 4 service days
  });

  it("counts toward the hourly rate", () => {
    const r = calculateGig(eater, { ...wedding, serviceHours: [2], foodStipend: { type: "flat", amount: 40 } }, lookups);
    expect(r.netCash).toBeCloseTo(400 + 40 - 12 - 28);
  });
});

describe("calculateGig: food details", () => {
  it("reports the days and daily cost used", () => {
    const eater: CalcProfile = { ...profile, mealRates: FEDERAL_MEAL_RATES };
    const r = calculateGig(eater, { ...orchestra, stayingOvernight: true }, lookups);
    expect([r.foodDays, r.foodRate]).toEqual([4, 68]);
    expect(calculateGig(eater, { ...orchestra, eatingOut: false }, lookups).foodDays).toBe(0);
  });
});

describe("calculateGig: count drive time", () => {
  it("is on by default", () => {
    const r = calculateGig(profile, { ...wedding, serviceHours: [2] }, lookups);
    expect(r.driveTimeCost).toBe(100);
    expect(r.totalHours).toBe(4);
  });

  it("off: no drive time cost, gas still counts", () => {
    const r = calculateGig(profile, { ...orchestra, countDriveTime: false }, lookups);
    expect(r.driveTimeCost).toBe(0);
    expect(r.gasCost).toBeCloseTo(48);
    expect(r.totalDriveHours).toBe(8); // still shown
    expect(r.realTakeHome).toBeCloseTo(750 - 48);
  });

  it("off: hourly rate uses playing hours only", () => {
    const r = calculateGig(profile, { ...wedding, serviceHours: [2], countDriveTime: false }, lookups);
    expect(r.totalHours).toBe(2);
    expect(r.realHourlyRate).toBeCloseTo(388 / 2);
  });
});

describe("calculateGig: actual figures after the gig", () => {
  const eater: CalcProfile = { ...profile, mealRates: FEDERAL_MEAL_RATES, taxRatePct: 25 };

  it("actual pay, gas, food and lodging replace the estimates", () => {
    const est = calculateGig(eater, { ...wedding, stayingOvernight: true, roomCostPerNight: 100 }, lookups);
    const r = calculateGig(
      eater,
      {
        ...wedding,
        stayingOvernight: true,
        roomCostPerNight: 100,
        actuals: { pay: 450, gas: 41, food: 30, lodging: 120 },
      },
      lookups,
    );
    expect(est.totalPay).toBe(400);
    expect(r.totalPay).toBe(450);
    expect(r.gasCost).toBe(41);
    expect(r.foodCost).toBe(30);
    expect(r.lodgingCost).toBe(120);
    expect(r.taxSetAside).toBeCloseTo(112.5); // tax follows the actual pay
    expect(r.actual).toEqual({ pay: true, gas: true, food: true, lodging: true });
    expect(r.realTakeHome).toBeCloseTo(450 - 41 - 30 - 120 - 100 - 112.5);
  });

  it("blank actuals keep the estimate", () => {
    const r = calculateGig(eater, { ...wedding, actuals: { gas: 20, pay: null } }, lookups);
    expect(r.totalPay).toBe(400);
    expect(r.gasCost).toBe(20);
    expect(r.foodCost).toBe(28);
    expect(r.actual).toEqual({ pay: false, gas: true, food: false, lodging: false });
  });

  it("an actual of zero counts (e.g. you ate nothing)", () => {
    const r = calculateGig(eater, { ...wedding, actuals: { food: 0 } }, lookups);
    expect(r.foodCost).toBe(0);
    expect(r.actual.food).toBe(true);
  });

  it("actual figures feed the hourly rate", () => {
    const r = calculateGig(eater, { ...wedding, serviceHours: [2], actuals: { pay: 500, gas: 12 } }, lookups);
    expect(r.netCash).toBeCloseTo(500 - 12 - 28);
  });
});
