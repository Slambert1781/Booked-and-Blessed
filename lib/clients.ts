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
export type ClientSummary = Pick<ClientRow, "id" | "name" | "kind" | "tier">;

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
    netCash: result.netCash,
    pension: result.pensionContribution,
    totalHours: result.playingHours > 0 ? result.totalHours : 0,
    minHourlyRate: s.minHourlyRate,
    client,
    discounts: s.discounts,
    rush: rushFor(serviceDates, s.rushPeriods, s.rushEnabled),
  });
}
