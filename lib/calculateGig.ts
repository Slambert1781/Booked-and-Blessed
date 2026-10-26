// The gig maths. Pure function: no I/O, full precision (round only for display).

export type CalcProfile = {
  mpg: number;
  playingRate: number;
  drivingRate: number | null; // null = use playingRate
  /** % of pay to set aside for taxes; null/0 = none. */
  taxRatePct?: number | null;
  /** The lowest real hourly rate you want to work for; null = no minimum. */
  minHourlyRate?: number | null;
  /** Food per day on a local gig (no overnight stay). */
  localMealRate?: number | null;
  /** Food per day when staying overnight or away all day. */
  overnightMealRate?: number | null;
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
  /** Nights you're staying, if not one fewer than the service days. */
  lodgingNights?: number | null;
  roomCostPerNight?: number | null;
  stipendPerNight?: number | null;

  /** Buying meals on this gig. Off = no food cost. Defaults to on. */
  eatingOut?: boolean;
  /**
   * Count your time behind the wheel. Off = no drive time cost, and the
   * hourly rate uses playing hours only. Defaults to on.
   */
  countDriveTime?: boolean;

  /** Length of each service in hours (same order as serviceDates). */
  serviceHours?: (number | null)[];
  isUnion?: boolean;
  /** % of pay the employer contributes to the union pension. */
  pensionPct?: number | null;
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
  /** Whether drive time was counted (the gig's switch). */
  driveTimeCounted: boolean;
  mileageReimbursement: number;
  lodgingStipend: number;
  lodgingCost: number;
  foodCost: number;
  /** Days of meals counted, and the rate used for each. */
  foodDays: number;
  foodRate: number;
  /** Take-home before the tax set-aside. */
  takeHomeBeforeTax: number;
  /** What you keep: after travel, lodging, food, drive time and the tax set-aside. */
  realTakeHome: number;

  /** Hours spent playing (sum of service lengths). */
  playingHours: number;
  /** Playing plus driving hours (playing only when drive time isn't counted). */
  totalHours: number;
  /** Money in hand after gas, lodging and food, before valuing drive time. */
  netCash: number;
  /** netCash per hour of playing and driving; null when no hours are known. */
  realHourlyRate: number | null;
  /** Compared with the profile minimum; null when either is unknown. */
  meetsMinimum: boolean | null;
  taxSetAside: number;
  /** Paid into the union pension on your behalf; not part of take-home. */
  pensionContribution: number;
};

const n = (v: number | null | undefined) => v ?? 0;

export function calculateGig(profile: CalcProfile, gig: CalcGig, lookups: CalcLookups): GigResult {
  const serviceDays = new Set(gig.serviceDates.filter(Boolean)).size;
  const roundTrips = gig.stayingOvernight ? 1 : serviceDays;
  const nights = gig.stayingOvernight
    ? gig.lodgingNights && gig.lodgingNights > 0
      ? gig.lodgingNights
      : Math.max(serviceDays - 1, 1)
    : 0;

  const totalPay =
    gig.gigType === "orchestra" ? n(gig.feePerService) * n(gig.numberOfServices) : n(gig.flatFee);

  const roundTripMiles = lookups.oneWayMiles * 2;
  const roundTripHours = (lookups.oneWayMinutes * 2) / 60;
  const totalMiles = roundTripMiles * roundTrips;
  const totalDriveHours = roundTripHours * roundTrips;

  const gasCost = profile.mpg > 0 ? (totalMiles / profile.mpg) * lookups.gasPricePerGallon : 0;
  const driveTimeRate = profile.drivingRate ?? profile.playingRate;
  const countDrive = gig.countDriveTime !== false;
  const driveTimeCost = countDrive ? totalDriveHours * driveTimeRate : 0;

  const mileageReimbursement = !gig.paysMileage
    ? 0
    : gig.reimbType === "per_mile"
      ? n(gig.reimbRatePerMile) * totalMiles
      : n(gig.flatReimbAmount);
  const lodgingCost = gig.stayingOvernight && !gig.hosted ? n(gig.roomCostPerNight) * nights : 0;
  const lodgingStipend = gig.stayingOvernight ? n(gig.stipendPerNight) * nights : 0;

  const foodDays = gig.eatingOut === false ? 0 : gig.stayingOvernight ? nights + 1 : serviceDays;
  const foodRate = gig.stayingOvernight ? n(profile.overnightMealRate) : n(profile.localMealRate);
  const foodCost = foodDays * foodRate;

  const takeHomeBeforeTax =
    totalPay + mileageReimbursement + lodgingStipend - gasCost - lodgingCost - foodCost - driveTimeCost;

  const playingHours = (gig.serviceHours ?? []).reduce<number>((sum, h) => sum + (h ?? 0), 0);
  const totalHours = playingHours + (countDrive ? totalDriveHours : 0);
  const netCash = totalPay + mileageReimbursement + lodgingStipend - gasCost - lodgingCost - foodCost;
  const realHourlyRate = playingHours > 0 ? netCash / totalHours : null;
  const meetsMinimum =
    realHourlyRate === null || profile.minHourlyRate == null ? null : realHourlyRate >= profile.minHourlyRate;
  const taxSetAside = totalPay * (n(profile.taxRatePct) / 100);
  const realTakeHome = takeHomeBeforeTax - taxSetAside;
  const pensionContribution = gig.isUnion ? totalPay * (n(gig.pensionPct) / 100) : 0;

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
    driveTimeCounted: countDrive,
    mileageReimbursement,
    lodgingStipend,
    lodgingCost,
    foodCost,
    foodDays,
    foodRate,
    takeHomeBeforeTax,
    realTakeHome,
    playingHours,
    totalHours,
    netCash,
    realHourlyRate,
    meetsMinimum,
    taxSetAside,
    pensionContribution,
  };
}
