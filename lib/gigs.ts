import { calculateGig, type CalcGig, type GigResult } from "@/lib/calculateGig";
import type { ProfileRow } from "@/lib/types";
import { num } from "@/lib/types";

export type GigStatus = "undecided" | "taken" | "declined";
export const GIG_STATUSES: GigStatus[] = ["undecided", "taken", "declined"];

export const STATUS_LABEL: Record<GigStatus, string> = {
  undecided: "Undecided",
  taken: "Booked",
  declined: "Declined",
};

/** Older rows (before the status column existed) count as undecided. */
export const statusOf = (gig: { status?: string | null }): GigStatus =>
  gig.status === "taken" || gig.status === "declined" ? gig.status : "undecided";

type Numeric = number | string | null;

export type GigRow = {
  id: string;
  title: string | null;
  gig_type: "orchestra" | "flat_fee";
  venue_address: string;
  venue_lat: number | null;
  venue_lng: number | null;
  fee_per_service: Numeric;
  number_of_services: number | null;
  flat_fee: Numeric;
  pays_mileage: boolean;
  reimb_type: "per_mile" | "flat" | null;
  reimb_rate_per_mile: Numeric;
  flat_reimb_amount: Numeric;
  staying_overnight: boolean;
  hosted: boolean;
  room_cost_per_night: Numeric;
  stipend_per_night: Numeric;
  one_way_miles: Numeric;
  one_way_minutes: Numeric;
  distance_is_manual: boolean;
  gas_price: Numeric;
  gas_price_source: string | null;
  gas_price_date: string | null;
  mpg_used: Numeric;
  playing_rate_used: Numeric;
  driving_rate_used: Numeric;
  status?: GigStatus | null;
  decided_at?: string | null;
  is_union?: boolean | null;
  pension_pct?: Numeric;
  created_at: string;
};

export type ServiceRow = {
  id: string;
  service_date: string;
  start_time: string | null;
  duration_hours?: Numeric;
};

/** Profile settings that apply to every gig (not frozen per gig). */
export type GigSettings = { taxRatePct: number | null; minHourlyRate: number | null };

export const settingsFrom = (p: ProfileRow | null | undefined): GigSettings => ({
  taxRatePct: num(p?.tax_rate_pct ?? null),
  minHourlyRate: num(p?.min_hourly_rate ?? null),
});

/** Recalculate a saved gig from its stored (frozen) values. */
export function resultForSavedGig(gig: GigRow, services: ServiceRow[], settings?: GigSettings): GigResult {
  const calcGig: CalcGig = {
    gigType: gig.gig_type,
    feePerService: num(gig.fee_per_service),
    numberOfServices: gig.number_of_services,
    flatFee: num(gig.flat_fee),
    serviceDates: services.map((s) => s.service_date),
    paysMileage: gig.pays_mileage,
    reimbType: gig.reimb_type,
    reimbRatePerMile: num(gig.reimb_rate_per_mile),
    flatReimbAmount: num(gig.flat_reimb_amount),
    stayingOvernight: gig.staying_overnight,
    hosted: gig.hosted,
    roomCostPerNight: num(gig.room_cost_per_night),
    stipendPerNight: num(gig.stipend_per_night),
    serviceHours: services.map((s) => num(s.duration_hours ?? null)),
    isUnion: gig.is_union ?? false,
    pensionPct: num(gig.pension_pct ?? null),
  };
  return calculateGig(
    {
      mpg: num(gig.mpg_used) ?? 0,
      playingRate: num(gig.playing_rate_used) ?? 0,
      drivingRate: num(gig.driving_rate_used),
      taxRatePct: settings?.taxRatePct ?? null,
      minHourlyRate: settings?.minHourlyRate ?? null,
    },
    calcGig,
    {
      oneWayMiles: num(gig.one_way_miles) ?? 0,
      oneWayMinutes: num(gig.one_way_minutes) ?? 0,
      gasPricePerGallon: num(gig.gas_price) ?? 0,
    },
  );
}
