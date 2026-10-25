// The gig maths. Pure function: no I/O, full precision (round only for display).

export type CalcProfile = {
  mpg: number;
  playingRate: number;
  drivingRate: number | null; // null = use playingRate
};

export type CalcGig = {
  gigType: "orchestra" | "flat_fee";
  feePerService?: number | null;
  numberOfServices?: number | null;
  flatFee?: number | null;
  /** Dates of each service as YYYY-MM-DD; duplicates are fine. */
  serviceDates: string[];

  paysMileage: boolean;
  reimbType?: "per_mile" | "flat" | null;
  reimbRatePerMile?: number | null;
  flatReimbAmount?: number | null;

  stayingOvernight: boolean;
  hosted: boolean;
  roomCostPerNight?: number | null;
  stipendPerNight?: number | null;
};

export type CalcLookups = {
  oneWayMiles: number;
  oneWayMinutes: number;
  gasPricePerGallon: number;
};

export type GigResult = {
  serviceDays: number;
  roundTrips: number;
  nights: number;
  totalPay: number;
  totalMiles: number;
  totalDriveHours: number;
  gasCost: number;
  driveTimeRate: number;
  driveTimeCost: number;
  mileageReimbursement: number;
  lodgingStipend: number;
  lodgingCost: number;
  realTakeHome: number;
};

const n = (v: number | null | undefined) => v ?? 0;

export function calculateGig(profile: CalcProfile, gig: CalcGig, lookups: CalcLookups): GigResult {
  const serviceDays = new Set(gig.serviceDates.filter(Boolean)).size;
  const roundTrips = gig.stayingOvernight ? 1 : serviceDays;
  const nights = gig.stayingOvernight ? Math.max(serviceDays - 1, 1) : 0;

  const totalPay =
    gig.gigType === "orchestra" ? n(gig.feePerService) * n(gig.numberOfServices) : n(gig.flatFee);

  const roundTripMiles = lookups.oneWayMiles * 2;
  const roundTripHours = (lookups.oneWayMinutes * 2) / 60;
  const totalMiles = roundTripMiles * roundTrips;
  const totalDriveHours = roundTripHours * roundTrips;

  const gasCost = profile.mpg > 0 ? (totalMiles / profile.mpg) * lookups.gasPricePerGallon : 0;
  const driveTimeRate = profile.drivingRate ?? profile.playingRate;
  const driveTimeCost = totalDriveHours * driveTimeRate;

  const mileageReimbursement = !gig.paysMileage
    ? 0
    : gig.reimbType === "per_mile"
      ? n(gig.reimbRatePerMile) * totalMiles
      : n(gig.flatReimbAmount);
  const lodgingCost = gig.stayingOvernight && !gig.hosted ? n(gig.roomCostPerNight) * nights : 0;
  const lodgingStipend = gig.stayingOvernight ? n(gig.stipendPerNight) * nights : 0;

  const realTakeHome =
    totalPay + mileageReimbursement + lodgingStipend - gasCost - lodgingCost - driveTimeCost;

  return {
    serviceDays,
    roundTrips,
    nights,
    totalPay,
    totalMiles,
    totalDriveHours,
    gasCost,
    driveTimeRate,
    driveTimeCost,
    mileageReimbursement,
    lodgingStipend,
    lodgingCost,
    realTakeHome,
  };
}
