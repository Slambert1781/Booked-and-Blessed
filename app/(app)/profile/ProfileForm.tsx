"use client";

import { useState, useTransition } from "react";
import { AddressInput, type AddressValue } from "@/components/AddressInput";
import { AvatarUpload } from "@/components/AvatarUpload";
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
