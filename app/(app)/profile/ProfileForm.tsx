"use client";

import { useState, useTransition } from "react";
import { AddressInput, type AddressValue } from "@/components/AddressInput";
import { AvatarUpload } from "@/components/AvatarUpload";
import { RushPeriodsEditor } from "@/components/RushPeriodsEditor";
import { relationshipSettingsFrom } from "@/lib/clients";
import { TIER_EXAMPLE, TIER_LABEL, TIERS, type RushPeriod } from "@/lib/relationships";
import { VehiclePicker, type Vehicle } from "@/components/VehiclePicker";
import { US_STATES } from "@/lib/states";
import { num, type ProfileRow } from "@/lib/types";
import { saveProfile } from "./actions";

const str = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(v));

export function ProfileForm({
  profile,
  name: initialName,
  userId,
  email,
  avatarUrl,
}: {
  profile: ProfileRow | null;
  name: string;
  userId: string;
  email: string;
  avatarUrl: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [home, setHome] = useState<AddressValue>({
    address: profile?.home_address ?? "",
    lat: profile?.home_lat ?? null,
    lng: profile?.home_lng ?? null,
    state: profile?.home_state ?? null,
  });
  const [vehicle, setVehicle] = useState<Vehicle>({
    year: str(profile?.vehicle_year),
    make: profile?.vehicle_make ?? "",
    model: profile?.vehicle_model ?? "",
    option: profile?.vehicle_option ?? "",
    id: str(profile?.fueleconomy_id),
  });
  const [lookedUpMpg, setLookedUpMpg] = useState<number | null>(
    profile && !profile.mpg_is_manual ? num(profile.mpg) : null,
  );
  const [manual, setManual] = useState(profile?.mpg_is_manual ?? false);
  const [manualMpg, setManualMpg] = useState(profile?.mpg_is_manual ? str(profile.mpg) : "");
  const [carError, setCarError] = useState<string | null>(null);
  const [playingRate, setPlayingRate] = useState(str(profile?.playing_rate));
  const [drivingRate, setDrivingRate] = useState(str(profile?.driving_rate));
  const [minHourlyRate, setMinHourlyRate] = useState(str(profile?.min_hourly_rate));
  const [taxRatePct, setTaxRatePct] = useState(str(profile?.tax_rate_pct));
  const rel = relationshipSettingsFrom(profile);
  const [tierDiscounts, setTierDiscounts] = useState<Record<string, string>>(
    Object.fromEntries(TIERS.map((t) => [t, String(rel.discounts[t])])),
  );
  const [holidayRushEnabled, setHolidayRushEnabled] = useState(rel.rushEnabled);
  const [rushPeriods, setRushPeriods] = useState<RushPeriod[]>(rel.rushPeriods);
  const [rushKeepPct, setRushKeepPct] = useState(String(rel.rushKeepPct));
  const [defaultServiceHours, setDefaultServiceHours] = useState(str(profile?.default_service_hours ?? 2.5));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveProfile({
        name,
        homeAddress: home.address,
        homeLat: home.lat,
        homeLng: home.lng,
        homeState: home.state ?? "",
        vehicleYear: vehicle.year,
        vehicleMake: vehicle.make,
        vehicleModel: vehicle.model,
        vehicleOption: vehicle.option,
        fueleconomyId: vehicle.id,
        mpg: manual ? manualMpg : str(lookedUpMpg),
        mpgIsManual: manual,
        playingRate,
        drivingRate,
        minHourlyRate,
        taxRatePct,
        defaultServiceHours,
        tierDiscounts,
        holidayRushEnabled,
        rushPeriods,
        rushKeepPct,
      });
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-8">
      <section className="space-y-4">
        <AvatarUpload userId={userId} url={avatarUrl} name={name} email={email} />
        <label className="block">
          <span className="block text-sm font-medium">Your name</span>
          <input
            className="field mt-1"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            placeholder="e.g. Sarah Lambert"
          />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Home</h2>
        <AddressInput
          id="home"
          label="Home address"
          value={home}
          onChange={(v) => setHome((prev) => ({ ...v, state: v.state ?? prev.state }))}
          placeholder="Start typing your address"
        />
        <label className="block">
          <span className="block text-sm font-medium">State</span>
          <select
            className="field mt-1"
            value={home.state ?? ""}
            onChange={(e) => setHome({ ...home, state: e.target.value || null })}
          >
            <option value="">Choose…</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-xs text-stone-500">Used to look up local gas prices.</span>
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Your car</h2>
        {!manual && (
          <>
            <VehiclePicker
              value={vehicle}
              onChange={(v) => {
                setVehicle(v);
                if (!v.id) setLookedUpMpg(null);
              }}
              onMpg={setLookedUpMpg}
              onError={setCarError}
            />
            {lookedUpMpg !== null && (
              <p className="rounded-lg bg-indigo-50 px-3 py-2 text-indigo-900">
                <strong>{lookedUpMpg} MPG</strong> combined (fueleconomy.gov)
              </p>
            )}
            {carError && <p className="text-sm text-amber-800">{carError}</p>}
          </>
        )}
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="h-5 w-5"
            checked={manual}
            onChange={(e) => setManual(e.target.checked)}
          />
          <span>Type in my own MPG instead</span>
        </label>
        {manual && (
          <label className="block">
            <span className="block text-sm font-medium">Miles per gallon</span>
            <input
              className="field mt-1"
              inputMode="decimal"
              value={manualMpg}
              onChange={(e) => setManualMpg(e.target.value)}
              placeholder="e.g. 22"
            />
            <span className="mt-1 block text-xs text-stone-500">
              Useful if your car gets different mileage, like a van loaded with gear.
            </span>
          </label>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">What your time is worth</h2>
        <Money
          label="Playing rate (per hour)"
          value={playingRate}
          onChange={setPlayingRate}
          placeholder="e.g. 50"
        />
        <Money
          label="Driving rate (per hour, optional)"
          value={drivingRate}
          onChange={setDrivingRate}
          placeholder="Leave blank to use your playing rate"
          hint="If you value time behind the wheel differently from playing time."
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Goals and taxes</h2>
        <Money
          label="Minimum real hourly rate (optional)"
          value={minHourlyRate}
          onChange={setMinHourlyRate}
          placeholder="e.g. 40"
          hint="Each gig shows whether it pays above or below this, once playing and driving time are counted."
        />
        <label className="block">
          <span className="block text-sm font-medium">Set aside for taxes (optional)</span>
          <div className="relative mt-1">
            <input
              className="field pr-8"
              inputMode="decimal"
              value={taxRatePct}
              onChange={(e) => setTaxRatePct(e.target.value)}
              placeholder="e.g. 25"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-500">%</span>
          </div>
          <span className="mt-1 block text-xs text-stone-500">A percentage of each gig&apos;s pay to put aside for taxes.</span>
        </label>
        <label className="block">
          <span className="block text-sm font-medium">Typical rehearsal or concert length</span>
          <div className="relative mt-1">
            <input
              className="field pr-14"
              inputMode="decimal"
              value={defaultServiceHours}
              onChange={(e) => setDefaultServiceHours(e.target.value)}
              placeholder="2.5"
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-500">hours</span>
          </div>
          <span className="mt-1 block text-xs text-stone-500">
            Filled in for each new service. You can change it per rehearsal or concert.
          </span>
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Relationship tiers</h2>
        <p className="text-sm text-stone-600">
          How much each client tier lowers your minimum hourly rate. A gig that loses money after gas and lodging
          is always red, whatever the tier.
        </p>
        <div className="divide-y divide-stone-200 rounded-2xl bg-white px-4 shadow-sm">
          {TIERS.map((t) => (
            <label key={t} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block font-medium">{TIER_LABEL[t]}</span>
                <span className="block text-xs text-stone-500">{TIER_EXAMPLE[t]}</span>
              </span>
              <span className="relative w-24 shrink-0">
                <input
                  className="field py-2 pr-8 text-right"
                  inputMode="decimal"
                  value={tierDiscounts[t]}
                  onChange={(e) => setTierDiscounts({ ...tierDiscounts, [t]: e.target.value })}
                  aria-label={`${TIER_LABEL[t]} discount`}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-500">%</span>
              </span>
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Holiday Rush</h2>
        <p className="text-sm text-stone-600">
          In your busiest weeks every date is scarce, so relationship discounts shrink. A gig counts as rush if any of
          its services falls in one of these periods (every year).
        </p>
        <label className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
          <span>Use Holiday Rush</span>
          <input
            type="checkbox"
            role="switch"
            className="h-6 w-6 accent-indigo-700"
            checked={holidayRushEnabled}
            onChange={(e) => setHolidayRushEnabled(e.target.checked)}
          />
        </label>
        {holidayRushEnabled && (
          <>
            <RushPeriodsEditor value={rushPeriods} onChange={setRushPeriods} />
            <label className="block">
              <span className="block text-sm font-medium">During a rush, keep this much of each discount</span>
              <div className="relative mt-1">
                <input
                  className="field pr-8"
                  inputMode="decimal"
                  value={rushKeepPct}
                  onChange={(e) => setRushKeepPct(e.target.value)}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-500">%</span>
              </div>
              <span className="mt-1 block text-xs text-stone-500">
                50% means a 40% discount becomes 20%. 0% means no discounts at all during a rush.
              </span>
            </label>
          </>
        )}
      </section>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-800">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

function Money({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
        <input
          className="field pl-7"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
      {hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}
    </label>
  );
}
