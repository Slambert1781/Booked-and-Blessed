import type { AddressValue } from "@/components/AddressInput";
import type { GigRow, GigStatus, ServiceRow } from "@/lib/gigs";
import { statusOf } from "@/lib/gigs";
import { num } from "@/lib/types";

export type FormService = { date: string; time: string; hours: string };

/** Where the gas price on the form came from; null = typed in by hand. */
export type GasSource = { areaName: string; periodDate: string | null; kind?: "state" | "region" | "national" } | null;

/** Everything the gig form edits, as the strings its inputs hold. */
export type GigFormValues = {
  title: string;
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
    title: gig.title ?? "",
    gigType: gig.gig_type,
    venue: { address: gig.venue_address, lat: gig.venue_lat, lng: gig.venue_lng, state: null },
    feePerService: str(gig.fee_per_service),
    flatFee: str(gig.flat_fee),
    services: services.map((s) => ({
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
