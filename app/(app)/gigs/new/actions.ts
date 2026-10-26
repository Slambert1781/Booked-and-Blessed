"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { oneWayDrive } from "@/lib/google/routes";
import { getProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";
import { GIG_STATUSES, type GigStatus } from "@/lib/gigs";
import { isProfileComplete, num } from "@/lib/types";

type Place = { address: string; lat: number | null; lng: number | null };

export async function lookupDrive(
  venue: Place,
): Promise<{ miles: number; minutes: number } | { error: string }> {
  const result = await getProfile();
  if (!result?.profile?.home_address) return { error: "Set your home address in your profile first." };
  const p = result.profile;
  try {
    return await oneWayDrive({ address: p.home_address!, lat: p.home_lat, lng: p.home_lng }, venue);
  } catch {
    return { error: "Couldn't find a driving route. Type the miles and drive time in below." };
  }
}

export type GigInput = {
  title: string;
  gigType: "orchestra" | "flat_fee";
  venue: Place;
  feePerService: string;
  flatFee: string;
  services: { date: string; time: string }[];
  paysMileage: boolean;
  reimbType: "per_mile" | "flat";
  reimbRatePerMile: string;
  flatReimbAmount: string;
  stayingOvernight: boolean;
  hosted: boolean;
  roomCostPerNight: string;
  stipendPerNight: string;
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

/** Check the form and turn it into database fields (shared by create and update). */
function validate(
  input: GigInput,
): { error: string } | { fields: GigRowFields; services: { date: string; time: string }[]; status: GigStatus } {
  const services = input.services.filter((s) => s.date);
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

const serviceRows = (userId: string, gigId: string, services: { date: string; time: string }[]) =>
  services.map((s) => ({ user_id: userId, gig_id: gigId, service_date: s.date, start_time: s.time || null }));

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
  const { data: existing } = await supabase.from("gigs").select("status, decided_at").eq("id", id).maybeSingle();
  if (!existing) return { error: "That gig no longer exists." };

  const decidedAt =
    v.status === "undecided" ? null : v.status === existing.status ? existing.decided_at : new Date().toISOString();

  const { error } = await supabase.from("gigs").update({ ...v.fields, decided_at: decidedAt }).eq("id", id);
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
