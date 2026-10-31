import type { GigResult } from "@/lib/calculateGig";
import {
  judgeGig,
  rushFor,
  rushPeriodsFrom,
  tierDiscountsFrom,
  type RushPeriod,
  type Tier,
  type TierDiscounts,
  type VerdictResult,
} from "@/lib/relationships";
import { num, type ProfileRow } from "@/lib/types";

export type ClientKind = "orchestra" | "church" | "contractor" | "private" | "other";

export const CLIENT_KINDS: ClientKind[] = ["orchestra", "church", "contractor", "private", "other"];

export const KIND_LABEL: Record<ClientKind, string> = {
  orchestra: "Orchestra",
  church: "Church",
  contractor: "Contractor",
  private: "Private client",
  other: "Other",
};

export type ClientRow = {
  id: string;
  name: string;
  kind: ClientKind;
  tier: Tier;
  notes: string | null;
  created_at: string;
};

/** The client fields the gig form and verdict need. */
export type ClientSummary = Pick<ClientRow, "id" | "name" | "kind" | "tier"> & {
  /** Venue and terms from the client's most recent gig (null until one is saved). */
  gigDefaults?: ClientGigDefaults | null;
};

/** What a client's gigs usually look like: filled in when the client is picked on the gig form. */
export type ClientGigDefaults = {
  venue: { address: string; lat: number | null; lng: number | null; name: string | null } | null;
  gigType: "orchestra" | "flat_fee";
  feePerService: number | null;
  flatFee: number | null;
  paysMileage: boolean;
  reimbType: "per_mile" | "flat" | null;
  reimbRatePerMile: number | null;
  flatReimbAmount: number | null;
  stayingOvernight: boolean;
  hosted: boolean;
  roomCostPerNight: number | null;
  stipendPerNight: number | null;
};

const numOrNull = (v: unknown) => {
  const n = Number(v);
  return v === null || v === undefined || v === "" || !Number.isFinite(n) ? null : n;
};

/** Read a client's saved gig_defaults defensively; null if missing or malformed. */
export function parseGigDefaults(raw: unknown): ClientGigDefaults | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const v = r.venue as Record<string, unknown> | null | undefined;
  return {
    venue:
      v && typeof v.address === "string" && v.address.trim()
        ? {
            address: v.address,
            lat: numOrNull(v.lat),
            lng: numOrNull(v.lng),
            name: typeof v.name === "string" && v.name.trim() ? v.name : null,
          }
        : null,
    gigType: r.gigType === "flat_fee" ? "flat_fee" : "orchestra",
    feePerService: numOrNull(r.feePerService),
    flatFee: numOrNull(r.flatFee),
    paysMileage: r.paysMileage === true,
    reimbType: r.reimbType === "flat" ? "flat" : r.reimbType === "per_mile" ? "per_mile" : null,
    reimbRatePerMile: numOrNull(r.reimbRatePerMile),
    flatReimbAmount: numOrNull(r.flatReimbAmount),
    stayingOvernight: r.stayingOvernight === true,
    hosted: r.hosted === true,
    roomCostPerNight: numOrNull(r.roomCostPerNight),
    stipendPerNight: numOrNull(r.stipendPerNight),
  };
}

/** Relationship settings from the profile, with defaults until they're saved. */
export type RelationshipSettings = {
  minHourlyRate: number | null;
  discounts: TierDiscounts;
  rushEnabled: boolean;
  rushPeriods: RushPeriod[];
};

export function relationshipSettingsFrom(p: ProfileRow | null | undefined): RelationshipSettings {
  return {
    minHourlyRate: num(p?.min_hourly_rate ?? null),
    discounts: tierDiscountsFrom(p?.tier_discounts),
    rushEnabled: p?.holiday_rush_enabled ?? true,
    rushPeriods: rushPeriodsFrom(p?.rush_periods),
  };
}

/** The verdict for a calculated gig. */
export function verdictFor(
  result: GigResult,
  serviceDates: string[],
  client: Pick<ClientRow, "name" | "tier"> | null,
  s: RelationshipSettings,
): VerdictResult | null {
  return judgeGig({
    cashTakeHome: result.realTakeHome,
    playingHours: result.playingHours,
    drivingHours: result.driveTimeCounted ? result.totalDriveHours : 0,
    drivingRate: result.driveTimeRate,
    playingRate: result.playingRate,
    minHourlyRate: s.minHourlyRate,
    client,
    discounts: s.discounts,
    rush: rushFor(serviceDates, s.rushPeriods, s.rushEnabled),
  });
}
