import { describe, expect, it } from "vitest";
import { calculateGig, type CalcGig, type CalcLookups, type CalcProfile } from "./calculateGig";

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
