// Row shapes as returned by Supabase. numeric columns come back as numbers or
// strings depending on size, so read them with num().
export type ProfileRow = {
  user_id: string;
  home_address: string | null;
  home_lat: number | null;
  home_lng: number | null;
  home_state: string | null;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_option: string | null;
  fueleconomy_id: number | null;
  mpg: number | string | null;
  mpg_is_manual: boolean;
  playing_rate: number | string | null;
  driving_rate: number | string | null;
  // Added with the hourly/tax/union update; absent until that SQL is run.
  min_hourly_rate?: number | string | null;
  tax_rate_pct?: number | string | null;
  default_service_hours?: number | string | null;
  meal_breakfast_rate?: number | string | null;
  meal_lunch_rate?: number | string | null;
  meal_dinner_rate?: number | string | null;
  meal_incidentals_rate?: number | string | null;
  // Added with the client directory update.
  tier_discounts?: unknown;
  holiday_rush_enabled?: boolean | null;
  rush_periods?: unknown;
  rush_discount_keep_pct?: number | string | null;
};

export function num(v: number | string | null | undefined): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function isProfileComplete(p: ProfileRow | null): boolean {
  return !!p && !!p.home_address && !!p.home_state && num(p.mpg) !== null && num(p.playing_rate) !== null;
}
