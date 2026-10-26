"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oneWayDrive } from "@/lib/google/routes";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { GIG_STATUSES, type GigStatus, type ServiceKind } from "@/lib/gigs";
import { DEFAULT_LOCAL_MEAL_RATE, DEFAULT_OVERNIGHT_MEAL_RATE, isProfileComplete, num } from "@/lib/types";

type Place = { address: string; lat: number | null; lng: number | null };

export async function lookupDrive(
  venue: Place,
): Promise<{ miles: number; minutes: number; from: string; to: string } | { error: string }> {
  const result = await getProfile();
  if (!result?.profile?.home_address) return { error: "Set your home address in your profile first." };
  const p = result.profile;
  try {
    const drive = await oneWayDrive({ address: p.home_address!, lat: p.home_lat, lng: p.home_lng }, venue);
    return { ...drive, from: p.home_address!, to: venue.address };
  } catch {
    return { error: "Couldn't find a driving route. Type the miles and drive time in below." };
  }
}

export type GigInput = {
  title: string;
  clientId: string | null;
  gigType: "orchestra" | "flat_fee";
  venue: Place;
  feePerService: string;
  flatFee: string;
  services: { kind: ServiceKind; date: string; time: string; hours: string }[];
  lodgingNights: string;
  eatingOut: boolean;
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
  oneWayMiles: string;
  oneWayMinutes: string;
  distanceIsManual: boolean;
  gasPrice: string;
  gasPriceSource: string;
  gasPriceDate: string | null;
  /** Optional decision; no choice saves as undecided. */
  status: GigStatus | null;
};

/** Blank -> null; otherwise a non-negative number or NaN (invalid). */
function amount(s: string): number | null {
  if (s.trim() === "") return null;
  const n = Number(s.replace(/[$,]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

type GigRowFields = Record<string, unknown>;
type SavedService = { kind: ServiceKind; date: string; time: string; hours: number | null };

/** Check the form and turn it into database fields (shared by create and update). */
function validate(
  input: GigInput,
): { error: string } | { fields: GigRowFields; services: SavedService[]; status: GigStatus } {
  const services = input.services
    .filter((s) => s.date)
    .map((s) => ({
      kind: (s.kind === "performance" ? "performance" : "rehearsal") as ServiceKind,
      date: s.date,
      time: s.time,
      hours: amount(s.hours),
    }));
  const nights = input.stayingOvernight ? amount(input.lodgingNights) : null;
  if (nights !== null && (Number.isNaN(nights) || nights < 1 || nights > 60 || !Number.isInteger(nights)))
    return { error: "Nights must be a whole number like 3, or leave it blank." };
  const fee = amount(input.feePerService);
  const flat = amount(input.flatFee);
  const rate = amount(input.reimbRatePerMile);
  const reimbFlat = amount(input.flatReimbAmount);
  const room = amount(input.roomCostPerNight);
  const stipend = amount(input.stipendPerNight);
  const miles = amount(input.oneWayMiles);
  const minutes = amount(input.oneWayMinutes);
  const gas = amount(input.gasPrice);

  if (!input.venue.address.trim()) return { error: "Enter where the gig is." };
  if (services.length === 0) return { error: "Add the date of at least one service." };
  if (input.gigType === "orchestra" && (fee === null || Number.isNaN(fee)))
    return { error: "Enter the fee per service." };
  if (input.gigType === "flat_fee" && (flat === null || Number.isNaN(flat)))
    return { error: "Enter the total fee." };
  if (input.paysMileage && input.reimbType === "per_mile" && (rate === null || Number.isNaN(rate)))
    return { error: "Enter the mileage rate per mile." };
  if (input.paysMileage && input.reimbType === "flat" && (reimbFlat === null || Number.isNaN(reimbFlat)))
    return { error: "Enter the flat mileage amount." };
  if (input.stayingOvernight && !input.hosted && (room === null || Number.isNaN(room)))
    return { error: "Enter the room cost per night, or tick 'hosted' if it's free." };
  if (services.some((s) => Number.isNaN(s.hours) || s.hours === 0 || (s.hours ?? 0) > 24))
    return { error: "Check the hours for each service: a number like 2.5, or leave it blank." };
  const pension = input.isUnion ? amount(input.pensionPct) : null;
  if (pension !== null && (Number.isNaN(pension) || pension > 100))
    return { error: "Pension contribution must be a percentage between 0 and 100." };
  if ([rate, reimbFlat, room, stipend].some((v) => Number.isNaN(v)))
    return { error: "Check the amounts: they must be numbers." };
  if (miles === null || Number.isNaN(miles) || minutes === null || Number.isNaN(minutes))
    return { error: "Enter the miles and drive time each way." };
  if (gas === null || Number.isNaN(gas) || gas === 0) return { error: "Enter the gas price per gallon." };

  const status: GigStatus = input.status && GIG_STATUSES.includes(input.status) ? input.status : "undecided";

  return {
    status,
    services,
    fields: {
      title: input.title.trim() || null,
      client_id: input.clientId || null,
      gig_type: input.gigType,
      venue_address: input.venue.address.trim(),
      venue_lat: input.venue.lat,
      venue_lng: input.venue.lng,
      fee_per_service: input.gigType === "orchestra" ? fee : null,
      number_of_services: input.gigType === "orchestra" ? services.length : null,
      flat_fee: input.gigType === "flat_fee" ? flat : null,
      pays_mileage: input.paysMileage,
      reimb_type: input.paysMileage ? input.reimbType : null,
      reimb_rate_per_mile: input.paysMileage && input.reimbType === "per_mile" ? rate : null,
      flat_reimb_amount: input.paysMileage && input.reimbType === "flat" ? reimbFlat : null,
      staying_overnight: input.stayingOvernight,
      hosted: input.stayingOvernight && input.hosted,
      room_cost_per_night: input.stayingOvernight && !input.hosted ? room : null,
      stipend_per_night: input.stayingOvernight ? stipend : null,
      lodging_nights: nights,
      eating_out: input.eatingOut,
      is_union: input.isUnion,
      pension_pct: pension,
      one_way_miles: miles,
      one_way_minutes: minutes,
      distance_is_manual: input.distanceIsManual,
      gas_price: gas,
      gas_price_source: input.gasPriceSource || "Entered by hand",
      gas_price_date: input.gasPriceDate,
      status,
    },
  };
}

const serviceRows = (userId: string, gigId: string, services: SavedService[]) =>
  services.map((s) => ({
    kind: s.kind,
    user_id: userId,
    gig_id: gigId,
    service_date: s.date,
    start_time: s.time || null,
    duration_hours: s.hours,
  }));

export async function createGig(input: GigInput): Promise<{ error: string } | void> {
  const result = await getProfile();
  if (!result) redirect("/sign-in");
  const profile = result.profile;
  if (!isProfileComplete(profile)) redirect("/profile");

  const v = validate(input);
  if ("error" in v) return v;

  const supabase = await createClient();
  const { data: gig, error } = await supabase
    .from("gigs")
    .insert({
      ...v.fields,
      user_id: result.userId,
      // The profile values this gig is worked out with, frozen.
      mpg_used: num(profile!.mpg),
      playing_rate_used: num(profile!.playing_rate),
      driving_rate_used: num(profile!.driving_rate),
      local_meal_rate_used: num(profile!.local_meal_rate ?? null) ?? DEFAULT_LOCAL_MEAL_RATE,
      overnight_meal_rate_used: num(profile!.overnight_meal_rate ?? null) ?? DEFAULT_OVERNIGHT_MEAL_RATE,
      decided_at: v.status === "undecided" ? null : new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !gig) return { error: "Couldn't save the gig. Please try again." };

  const { error: servicesError } = await supabase.from("gig_services").insert(serviceRows(result.userId, gig.id, v.services));
  if (servicesError) {
    await supabase.from("gigs").delete().eq("id", gig.id);
    return { error: "Couldn't save the service dates. Please try again." };
  }

  redirect(`/?saved=${gig.id}`);
}

/**
 * Save changes to an existing gig. Keeps the MPG and hourly rates it was
 * originally worked out with; everything on the form can change.
 */
export async function updateGig(id: string, input: GigInput): Promise<{ error: string } | void> {
  const result = await getProfile();
  if (!result) redirect("/sign-in");

  const v = validate(input);
  if ("error" in v) return v;

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("gigs")
    .select("status, decided_at, local_meal_rate_used, overnight_meal_rate_used")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { error: "That gig no longer exists." };

  const decidedAt =
    v.status === "undecided" ? null : v.status === existing.status ? existing.decided_at : new Date().toISOString();

  // Gigs saved before food costs existed pick up today's meal rates the first
  // time they're edited; after that their rates stay fixed like the rest.
  const p = result.profile;
  const mealRates = {
    local_meal_rate_used:
      existing.local_meal_rate_used ?? num(p?.local_meal_rate ?? null) ?? DEFAULT_LOCAL_MEAL_RATE,
    overnight_meal_rate_used:
      existing.overnight_meal_rate_used ?? num(p?.overnight_meal_rate ?? null) ?? DEFAULT_OVERNIGHT_MEAL_RATE,
  };

  const { error } = await supabase
    .from("gigs")
    .update({ ...v.fields, ...mealRates, decided_at: decidedAt })
    .eq("id", id);
  if (error) return { error: "Couldn't save your changes. Please try again." };

  // Replace the schedule with what's on the form: add the new rows first, then
  // remove the old ones, so a failure never leaves the gig without dates.
  const { data: old } = await supabase.from("gig_services").select("id").eq("gig_id", id);
  const { error: insError } = await supabase.from("gig_services").insert(serviceRows(result.userId, id, v.services));
  if (insError) return { error: "Couldn't update the service dates. Please try again." };
  const oldIds = (old ?? []).map((r) => r.id);
  if (oldIds.length) await supabase.from("gig_services").delete().in("id", oldIds);

  revalidatePath("/", "layout");
  redirect(`/gigs/${id}?updated=1`);
}
