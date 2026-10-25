"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ProfileInput = {
  homeAddress: string;
  homeLat: number | null;
  homeLng: number | null;
  homeState: string;
  vehicleYear: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleOption: string;
  fueleconomyId: string;
  mpg: string;
  mpgIsManual: boolean;
  playingRate: string;
  drivingRate: string;
};

const positive = (s: string) => {
  const n = Number(s);
  return s.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
};

export async function saveProfile(input: ProfileInput): Promise<{ error: string } | void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const mpg = positive(input.mpg);
  const playingRate = positive(input.playingRate);
  const drivingRate = input.drivingRate.trim() === "" ? null : positive(input.drivingRate);

  if (!input.homeAddress.trim()) return { error: "Enter your home address." };
  if (!input.homeState) return { error: "Choose your state (used for gas prices)." };
  if (mpg === null) return { error: "Choose your car or type in its MPG." };
  if (playingRate === null) return { error: "Enter your playing rate per hour." };
  if (input.drivingRate.trim() !== "" && drivingRate === null)
    return { error: "Driving rate must be a positive number, or leave it blank." };

  const { error } = await supabase.from("profiles").upsert({
    user_id: user.id,
    home_address: input.homeAddress.trim(),
    home_lat: input.homeLat,
    home_lng: input.homeLng,
    home_state: input.homeState,
    vehicle_year: input.vehicleYear ? Number(input.vehicleYear) : null,
    vehicle_make: input.vehicleMake || null,
    vehicle_model: input.vehicleModel || null,
    vehicle_option: input.vehicleOption || null,
    fueleconomy_id: input.fueleconomyId ? Number(input.fueleconomyId) : null,
    mpg,
    mpg_is_manual: input.mpgIsManual,
    playing_rate: playingRate,
    driving_rate: drivingRate,
  });
  if (error) return { error: "Couldn't save your profile. Please try again." };

  redirect("/");
}
