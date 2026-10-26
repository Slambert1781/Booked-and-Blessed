import type { AddressValue } from "@/components/AddressInput";
import type { GigRow, GigStatus, ServiceKind, ServiceRow } from "@/lib/gigs";
import { statusOf } from "@/lib/gigs";
import { parseMealChoice, type MealChoice } from "@/lib/meals";
import { num } from "@/lib/types";

export type FormService = { kind: ServiceKind; date: string; time: string; hours: string };

/** Where the gas price on the form came from; null = typed in by hand. */
export type GasSource = { areaName: string; periodDate: string | null; kind?: "state" | "region" | "national" } | null;

/** Everything the gig form edits, as the strings its inputs hold. */
export type GigFormValues = {
  title: string;
  clientId: string | null;
  gigType: "orchestra" | "flat_fee";
  venue: AddressValue;
  feePerService: string;
  flatFee: string;
  services: FormService[];
  paysMileage: boolean;
  reimbType: "per_mile" | "flat";
  reimbRatePerMile: string;
  flatReimbAmount: string;
  stayingOvernight: boolean;
  hosted: boolean;
  roomCostPerNight: string;
  stipendPerNight: string;
  /** "" = work it out from the dates. */
  lodgingNights: string;
  eatingOut: boolean;
  meals: MealChoice | null;
  paysFoodStipend: boolean;
  foodStipendType: "per_day" | "flat";
  foodStipendAmount: string;
  countDriveTime: boolean;
  /** Entered after it was played (no estimate beforehand). */
  alreadyPlayed: boolean;
  actualPay: string;
  actualGas: string;
  actualFood: string;
  actualLodging: string;
  isUnion: boolean;
  pensionPct: string;
  miles: string;
  minutes: string;
  distanceIsManual: boolean;
  gasPrice: string;
  gasSource: GasSource;
  status: GigStatus | null;
};

const str = (v: number | string | null | undefined) => {
  const n = num(v ?? null);
  return n === null ? "" : String(n);
};

/**
 * Form values from a saved gig. "edit" keeps everything, including its gas
 * price and decision; "copy" starts undecided and leaves the gas price to the
 * caller (today's average).
 */
export function gigToFormValues(gig: GigRow, services: ServiceRow[], mode: "edit" | "copy"): GigFormValues {
  const hand = !gig.gas_price_source || gig.gas_price_source === "Entered by hand";
  return {
    // A copy needs its own name, so it starts blank.
    title: mode === "edit" ? (gig.title ?? "") : "",
    clientId: gig.client_id ?? null,
    gigType: gig.gig_type,
    venue: { address: gig.venue_address, lat: gig.venue_lat, lng: gig.venue_lng, state: null },
    feePerService: str(gig.fee_per_service),
    flatFee: str(gig.flat_fee),
    services: services.map((s) => ({
      kind: s.kind ?? "rehearsal",
      date: s.service_date,
      time: (s.start_time ?? "").slice(0, 5),
      hours: str(s.duration_hours),
    })),
    paysMileage: gig.pays_mileage,
    reimbType: gig.reimb_type ?? "per_mile",
    reimbRatePerMile: str(gig.reimb_rate_per_mile),
    flatReimbAmount: str(gig.flat_reimb_amount),
    stayingOvernight: gig.staying_overnight,
    hosted: gig.hosted,
    roomCostPerNight: str(gig.room_cost_per_night),
    stipendPerNight: str(gig.stipend_per_night),
    lodgingNights: gig.lodging_nights ? String(gig.lodging_nights) : "",
    eatingOut: gig.eating_out ?? true,
    meals: parseMealChoice(gig.meals),
    paysFoodStipend: !!gig.food_stipend_type,
    foodStipendType: gig.food_stipend_type ?? "per_day",
    foodStipendAmount: str(gig.food_stipend_amount ?? null),
    countDriveTime: gig.count_drive_time ?? true,
    // A copy is a new gig: it starts with no actual figures.
    alreadyPlayed: mode === "edit" ? (gig.logged_after ?? false) : false,
    actualPay: mode === "edit" ? str(gig.actual_pay ?? null) : "",
    actualGas: mode === "edit" ? str(gig.actual_gas_cost ?? null) : "",
    actualFood: mode === "edit" ? str(gig.actual_food_cost ?? null) : "",
    actualLodging: mode === "edit" ? str(gig.actual_lodging_cost ?? null) : "",
    isUnion: gig.is_union ?? false,
    pensionPct: str(gig.pension_pct),
    miles: str(gig.one_way_miles),
    minutes: (() => {
      const m = num(gig.one_way_minutes);
      return m === null ? "" : String(Math.round(m));
    })(),
    distanceIsManual: gig.distance_is_manual,
    gasPrice: mode === "edit" ? str(gig.gas_price) : "",
    gasSource: mode === "edit" && !hand ? { areaName: gig.gas_price_source!, periodDate: gig.gas_price_date ?? null } : null,
    status: mode === "edit" ? statusOf(gig) : null,
  };
}
