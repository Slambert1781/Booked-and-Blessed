"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AddressInput, type AddressValue } from "@/components/AddressInput";
import { ResultBreakdown } from "@/components/ResultBreakdown";
import { calculateGig, type CalcProfile } from "@/lib/calculateGig";
import type { GasPrice } from "@/lib/eia/gasPrice";
import { formatDate } from "@/lib/format";
import { createGig, lookupDrive } from "./actions";

type Service = { date: string; time: string };

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const parse = (s: string) => {
  const n = Number(s.replace(/[$,]/g, ""));
  return s.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
};

export function GigForm({ profile, gas }: { profile: CalcProfile; gas: GasPrice | null }) {
  const [title, setTitle] = useState("");
  const [gigType, setGigType] = useState<"orchestra" | "flat_fee">("orchestra");
  const [venue, setVenue] = useState<AddressValue>({ address: "", lat: null, lng: null, state: null });
  const [feePerService, setFeePerService] = useState("");
  const [flatFee, setFlatFee] = useState("");
  const [services, setServices] = useState<Service[]>([{ date: today(), time: "" }]);

  const [paysMileage, setPaysMileage] = useState(false);
  const [reimbType, setReimbType] = useState<"per_mile" | "flat">("per_mile");
  const [reimbRatePerMile, setReimbRatePerMile] = useState("");
  const [flatReimbAmount, setFlatReimbAmount] = useState("");

  const [stayingOvernight, setStayingOvernight] = useState(false);
  const [hosted, setHosted] = useState(false);
  const [roomCostPerNight, setRoomCostPerNight] = useState("");
  const [stipendPerNight, setStipendPerNight] = useState("");

  const [miles, setMiles] = useState("");
  const [minutes, setMinutes] = useState("");
  const [distanceIsManual, setDistanceIsManual] = useState(false);
  const [driveStatus, setDriveStatus] = useState<"idle" | "loading" | "found" | "error">("idle");
  const [driveError, setDriveError] = useState<string | null>(null);

  const [gasPrice, setGasPrice] = useState(gas ? String(gas.price) : "");
  const [gasEdited, setGasEdited] = useState(!gas);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function runLookup(v: AddressValue) {
    if (!v.address.trim()) return;
    setDriveStatus("loading");
    setDriveError(null);
    const r = await lookupDrive({ address: v.address, lat: v.lat, lng: v.lng });
    if ("error" in r) {
      setDriveStatus("error");
      setDriveError(r.error);
      setDistanceIsManual(true);
      return;
    }
    setMiles(r.miles.toFixed(1));
    setMinutes(String(Math.round(r.minutes)));
    setDistanceIsManual(false);
    setDriveStatus("found");
  }

  // Look up the drive as soon as a suggested address (with coordinates) is picked.
  useEffect(() => {
    if (venue.lat !== null && venue.lng !== null) runLookup(venue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue.lat, venue.lng]);

  const preview = useMemo(() => {
    const m = parse(miles);
    const min = parse(minutes);
    const g = parse(gasPrice);
    const dates = services.map((s) => s.date).filter(Boolean);
    const pay = gigType === "orchestra" ? parse(feePerService) : parse(flatFee);
    if (m === null || min === null || g === null || pay === null || dates.length === 0) return null;
    return calculateGig(
      profile,
      {
        gigType,
        feePerService: parse(feePerService),
        numberOfServices: dates.length,
        flatFee: parse(flatFee),
        serviceDates: dates,
        paysMileage,
        reimbType,
        reimbRatePerMile: parse(reimbRatePerMile),
        flatReimbAmount: parse(flatReimbAmount),
        stayingOvernight,
        hosted,
        roomCostPerNight: parse(roomCostPerNight),
        stipendPerNight: parse(stipendPerNight),
      },
      { oneWayMiles: m, oneWayMinutes: min, gasPricePerGallon: g },
    );
  }, [
    profile, gigType, feePerService, flatFee, services, paysMileage, reimbType, reimbRatePerMile,
    flatReimbAmount, stayingOvernight, hosted, roomCostPerNight, stipendPerNight, miles, minutes, gasPrice,
  ]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await createGig({
        title,
        gigType,
        venue: { address: venue.address, lat: venue.lat, lng: venue.lng },
        feePerService,
        flatFee,
        services,
        paysMileage,
        reimbType,
        reimbRatePerMile,
        flatReimbAmount,
        stayingOvernight,
        hosted,
        roomCostPerNight,
        stipendPerNight,
        oneWayMiles: miles,
        oneWayMinutes: minutes,
        distanceIsManual,
        gasPrice,
        gasPriceSource: gas && !gasEdited ? gas.areaName : "Entered by hand",
        gasPriceDate: gas && !gasEdited ? gas.periodDate : null,
      });
      if (r?.error) setError(r.error);
    });
  }

  const updateService = (i: number, patch: Partial<Service>) =>
    setServices(services.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  return (
    <form onSubmit={submit} className="mt-6 space-y-8">
      <section className="space-y-3">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-stone-200 p-1">
          {(
            [
              ["orchestra", "Orchestra", "paid per service"],
              ["flat_fee", "Flat fee", "wedding, church…"],
            ] as const
          ).map(([value, label, sub]) => (
            <button
              key={value}
              type="button"
              onClick={() => setGigType(value)}
              className={`rounded-lg px-3 py-2 text-center ${gigType === value ? "bg-white shadow-sm" : "text-stone-600"}`}
            >
              <span className="block font-semibold">{label}</span>
              <span className="block text-xs text-stone-500">{sub}</span>
            </button>
          ))}
        </div>

        <TextField label="Gig name (optional)" value={title} onChange={setTitle} placeholder="e.g. Messiah with Hill Country Symphony" />

        {gigType === "orchestra" ? (
          <MoneyField label="Fee per service" value={feePerService} onChange={setFeePerService} />
        ) : (
          <MoneyField label="Total fee" value={flatFee} onChange={setFlatFee} />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Where</h2>
        <AddressInput id="venue" label="Venue" value={venue} onChange={setVenue} placeholder="Start typing the venue" />
        {venue.address && venue.lat === null && (
          <button type="button" className="btn-secondary w-full" onClick={() => runLookup(venue)}>
            Look up drive from home
          </button>
        )}
        {driveStatus === "loading" && <p className="text-sm text-stone-500">Working out the drive…</p>}
        {driveError && <p className="text-sm text-amber-800">{driveError}</p>}
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Miles each way"
            value={miles}
            onChange={(v) => {
              setMiles(v);
              setDistanceIsManual(true);
            }}
            inputMode="decimal"
          />
          <TextField
            label="Minutes each way"
            value={minutes}
            onChange={(v) => {
              setMinutes(v);
              setDistanceIsManual(true);
            }}
            inputMode="numeric"
          />
        </div>
        {driveStatus === "found" && !distanceIsManual && (
          <p className="text-xs text-stone-500">From Google Maps. You can change these if you know better.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">{gigType === "orchestra" ? "Services" : "When"}</h2>
        {gigType === "orchestra" && (
          <p className="text-sm text-stone-600">Add each rehearsal and concert.</p>
        )}
        <ul className="space-y-2">
          {services.map((s, i) => (
            <li key={i} className="flex items-end gap-2">
              <label className="flex-1">
                <span className="block text-xs text-stone-500">Date</span>
                <input type="date" className="field mt-1" value={s.date} onChange={(e) => updateService(i, { date: e.target.value })} />
              </label>
              <label className="w-32">
                <span className="block text-xs text-stone-500">Start</span>
                <input type="time" className="field mt-1" value={s.time} onChange={(e) => updateService(i, { time: e.target.value })} />
              </label>
              {services.length > 1 && (
                <button
                  type="button"
                  aria-label="Remove"
                  className="mb-1 h-11 w-11 rounded-lg text-xl text-stone-500 active:bg-stone-200"
                  onClick={() => setServices(services.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn-secondary w-full"
          onClick={() => setServices([...services, { date: services.at(-1)?.date ?? today(), time: services.at(-1)?.time ?? "" }])}
        >
          + Add {gigType === "orchestra" ? "a service" : "another date"}
        </button>
        {gigType === "orchestra" && (
          <p className="text-sm text-stone-600">
            {services.filter((s) => s.date).length} services on{" "}
            {new Set(services.map((s) => s.date).filter(Boolean)).size} days
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Extras</h2>
        <Toggle label="They pay mileage" checked={paysMileage} onChange={setPaysMileage} />
        {paysMileage && (
          <div className="space-y-3 rounded-xl bg-white p-3 shadow-sm">
            <div className="flex gap-4">
              <Radio name="reimb" label="Per mile" checked={reimbType === "per_mile"} onChange={() => setReimbType("per_mile")} />
              <Radio name="reimb" label="Flat amount" checked={reimbType === "flat"} onChange={() => setReimbType("flat")} />
            </div>
            {reimbType === "per_mile" ? (
              <MoneyField label="Rate per mile" value={reimbRatePerMile} onChange={setReimbRatePerMile} placeholder="e.g. 0.50" />
            ) : (
              <MoneyField label="Flat mileage amount" value={flatReimbAmount} onChange={setFlatReimbAmount} />
            )}
          </div>
        )}

        <Toggle label="I'm staying overnight" checked={stayingOvernight} onChange={setStayingOvernight} />
        {stayingOvernight && (
          <div className="space-y-3 rounded-xl bg-white p-3 shadow-sm">
            <Toggle label="Hosted (room is free)" checked={hosted} onChange={setHosted} />
            {!hosted && <MoneyField label="Room cost per night" value={roomCostPerNight} onChange={setRoomCostPerNight} />}
            <MoneyField label="Lodging stipend per night (if any)" value={stipendPerNight} onChange={setStipendPerNight} />
          </div>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Gas price</h2>
        <MoneyField
          label="Price per gallon"
          value={gasPrice}
          onChange={(v) => {
            setGasPrice(v);
            setGasEdited(true);
          }}
        />
        {gas && !gasEdited && (
          <p className="text-xs text-stone-500">
            {gas.kind === "state" ? "State" : gas.kind === "region" ? "Regional" : "National"} average for{" "}
            {gas.areaName}, week of {formatDate(gas.periodDate, { weekday: undefined, year: "numeric" })} (U.S. EIA)
          </p>
        )}
        {gas && gasEdited && (
          <button
            type="button"
            className="text-xs text-indigo-700"
            onClick={() => {
              setGasPrice(String(gas.price));
              setGasEdited(false);
            }}
          >
            Use the EIA average (${gas.price.toFixed(3)} for {gas.areaName})
          </button>
        )}
        {!gas && (
          <p className="text-sm text-amber-800">
            Couldn&apos;t get today&apos;s gas price from the EIA. Type in what you&apos;re paying.
          </p>
        )}
      </section>

      {preview && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">The real pay</h2>
          <ResultBreakdown result={preview} />
        </section>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-800">{error}</p>}
      <button type="submit" className="btn-primary sticky bottom-4 w-full shadow-lg" disabled={pending}>
        {pending ? "Saving…" : "Save gig"}
      </button>
    </form>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "decimal" | "numeric";
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      <input className="field mt-1" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} inputMode={inputMode} />
    </label>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
        <input className="field pl-7" inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
      </div>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
      <span>{label}</span>
      <input type="checkbox" role="switch" className="h-6 w-6 accent-indigo-700" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );
}

function Radio({ name, label, checked, onChange }: { name: string; label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2">
      <input type="radio" name={name} className="h-5 w-5 accent-indigo-700" checked={checked} onChange={onChange} />
      {label}
    </label>
  );
}
