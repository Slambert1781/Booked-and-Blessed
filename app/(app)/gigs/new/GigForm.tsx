"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { AddressInput, type AddressValue } from "@/components/AddressInput";
import { ClientPicker } from "@/components/ClientPicker";
import { DecisionPicker } from "@/components/DecisionPicker";
import { ResultBreakdown } from "@/components/ResultBreakdown";
import { calculateGig, type CalcGig, type CalcProfile } from "@/lib/calculateGig";
import { verdictFor, type ClientSummary, type RelationshipSettings } from "@/lib/clients";
import type { GasPrice } from "@/lib/eia/gasPrice";
import { formatDate, formatMoney } from "@/lib/format";
import type { GigStatus, ServiceKind } from "@/lib/gigs";
import type { FormService, GasSource, GigFormValues } from "@/lib/gigForm";
import { dailyMealCost, defaultMeals, MEAL_LABEL, MEALS, type MealChoice } from "@/lib/meals";
import { createGig, gasPriceForDate, lookupDrive, updateGig } from "./actions";

type Service = FormService;

export type GigFormMode = { kind: "new" } | { kind: "copy" } | { kind: "edit"; gigId: string };

/** Fields that can be flagged as missing. */
type Field =
  | "title"
  | "fee"
  | "venue"
  | "miles"
  | "minutes"
  | "dates"
  | "reimbRate"
  | "reimbFlat"
  | "roomCost"
  | "gasPrice"
  | "foodStipend";

const FIELD_LABEL: Record<Field, string> = {
  title: "Gig name",
  fee: "Fee",
  venue: "Venue",
  miles: "Miles each way",
  minutes: "Minutes each way",
  dates: "Date of each service",
  reimbRate: "Mileage rate per mile",
  reimbFlat: "Flat mileage amount",
  roomCost: "Room cost per night",
  gasPrice: "Gas price",
  foodStipend: "Food stipend amount",
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const parse = (s: string) => {
  const n = Number(s.replace(/[$,]/g, ""));
  return s.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
};

export function GigForm({
  profile,
  gas,
  initial,
  mode = { kind: "new" },
  defaultServiceHours,
  clients,
  relationship,
  copiedFromTitle,
}: {
  profile: CalcProfile;
  /** Today's EIA average (null if unavailable). */
  gas: GasPrice | null;
  /** Starting values when editing or copying a gig. */
  initial?: GigFormValues;
  mode?: GigFormMode;
  /** Pre-filled length for new services. */
  defaultServiceHours?: number;
  clients: ClientSummary[];
  relationship: RelationshipSettings;
  /** When copying: the original gig's name, which the copy mustn't reuse. */
  copiedFromTitle?: string;
}) {
  const defaultHours = String(defaultServiceHours ?? 2.5);
  const todaysGas: GasSource = gas ? { areaName: gas.areaName, periodDate: gas.periodDate, kind: gas.kind } : null;

  const [title, setTitle] = useState(initial?.title ?? "");
  const [client, setClient] = useState<ClientSummary | null>(
    clients.find((c) => c.id === initial?.clientId) ?? null,
  );
  // "orchestra" = paid per service, "flat_fee" = one fee for the whole gig.
  const [gigType, setGigType] = useState<"orchestra" | "flat_fee">(initial?.gigType ?? "orchestra");
  const [venue, setVenue] = useState<AddressValue>(initial?.venue ?? { address: "", lat: null, lng: null, state: null });
  const [feePerService, setFeePerService] = useState(initial?.feePerService ?? "");
  const [flatFee, setFlatFee] = useState(initial?.flatFee ?? "");
  const [services, setServices] = useState<Service[]>(
    initial?.services.length
      ? initial.services
      : [{ kind: "rehearsal", date: today(), time: "", hours: defaultHours }],
  );

  const [paysMileage, setPaysMileage] = useState(initial?.paysMileage ?? false);
  const [reimbType, setReimbType] = useState<"per_mile" | "flat">(initial?.reimbType ?? "per_mile");
  const [reimbRatePerMile, setReimbRatePerMile] = useState(initial?.reimbRatePerMile ?? "");
  const [flatReimbAmount, setFlatReimbAmount] = useState(initial?.flatReimbAmount ?? "");

  const [isUnion, setIsUnion] = useState(initial?.isUnion ?? false);
  const [pensionPct, setPensionPct] = useState(initial?.pensionPct ?? "");

  const [stayingOvernight, setStayingOvernight] = useState(initial?.stayingOvernight ?? false);
  const [hosted, setHosted] = useState(initial?.hosted ?? false);
  const [roomCostPerNight, setRoomCostPerNight] = useState(initial?.roomCostPerNight ?? "");
  const [stipendPerNight, setStipendPerNight] = useState(initial?.stipendPerNight ?? "");
  const [lodgingNights, setLodgingNights] = useState(initial?.lodgingNights ?? "");
  const [eatingOut, setEatingOut] = useState(initial?.eatingOut ?? true);
  // Null until you pick meals yourself: then it follows the gig (dinner locally, all overnight).
  const [chosenMeals, setChosenMeals] = useState<MealChoice | null>(initial?.meals ?? null);
  const meals = chosenMeals ?? defaultMeals(stayingOvernight);
  const [paysFoodStipend, setPaysFoodStipend] = useState(initial?.paysFoodStipend ?? false);
  const [foodStipendType, setFoodStipendType] = useState<"per_day" | "flat">(initial?.foodStipendType ?? "per_day");
  const [foodStipendAmount, setFoodStipendAmount] = useState(initial?.foodStipendAmount ?? "");
  const [countDriveTime, setCountDriveTime] = useState(initial?.countDriveTime ?? true);

  // After the gig: what it really paid and cost. Blank = use the estimate.
  const [alreadyPlayed, setAlreadyPlayed] = useState(initial?.alreadyPlayed ?? false);
  const [actualPay, setActualPay] = useState(initial?.actualPay ?? "");
  const [actualGas, setActualGas] = useState(initial?.actualGas ?? "");
  const [actualFood, setActualFood] = useState(initial?.actualFood ?? "");
  const [actualLodging, setActualLodging] = useState(initial?.actualLodging ?? "");

  const [miles, setMiles] = useState(initial?.miles ?? "");
  const [minutes, setMinutes] = useState(initial?.minutes ?? "");
  const [distanceIsManual, setDistanceIsManual] = useState(initial?.distanceIsManual ?? false);
  const [driveStatus, setDriveStatus] = useState<"idle" | "loading" | "found" | "error">("idle");
  const [driveError, setDriveError] = useState<string | null>(null);
  // The two addresses the current miles were worked out between.
  const [driveRoute, setDriveRoute] = useState<{ from: string; to: string } | null>(null);
  const lookupId = useRef(0);

  // Editing keeps the gig's saved price; new gigs and copies start from today's average.
  const startGas = initial?.gasPrice
    ? { price: initial.gasPrice, source: initial.gasSource }
    : { price: gas ? String(gas.price) : "", source: todaysGas };
  const [gasPrice, setGasPrice] = useState(startGas.price);
  const [gasSource, setGasSource] = useState<GasSource>(startGas.source);

  const [status, setStatus] = useState<GigStatus | null>(initial?.status ?? null);
  const [error, setError] = useState<string | null>(null);
  const [triedToSave, setTriedToSave] = useState(false);
  const [pending, startTransition] = useTransition();

  async function runLookup(v: AddressValue) {
    if (!v.address.trim()) return;
    const id = ++lookupId.current;
    setDriveStatus("loading");
    setDriveError(null);
    const r = await lookupDrive({ address: v.address, lat: v.lat, lng: v.lng });
    // A newer lookup has started since (the venue changed): ignore this answer.
    if (id !== lookupId.current) return;
    if ("error" in r) {
      setDriveRoute(null);
      setDriveStatus("error");
      setDriveError(r.error);
      setDistanceIsManual(true);
      return;
    }
    setMiles(r.miles.toFixed(1));
    setMinutes(String(Math.round(r.minutes)));
    setDistanceIsManual(false);
    setDriveRoute({ from: r.from, to: r.to });
    setDriveStatus("found");
  }

  // When the venue changes, miles looked up for the old venue no longer apply.
  function changeVenue(v: AddressValue) {
    if (v.address !== venue.address) {
      lookupId.current++; // cancel any lookup in flight
      if (!distanceIsManual && (driveRoute || driveStatus !== "idle")) {
        setMiles("");
        setMinutes("");
      }
      setDriveRoute(null);
      setDriveStatus("idle");
      setDriveError(null);
    }
    setVenue(v);
  }

  // Look up the drive as soon as a suggested address (with coordinates) is
  // picked, but not for the venue a saved gig already had.
  const lookedUp = useRef(initial ? `${initial.venue.lat},${initial.venue.lng}` : "");
  useEffect(() => {
    const key = `${venue.lat},${venue.lng}`;
    if (venue.lat !== null && venue.lng !== null && key !== lookedUp.current) {
      lookedUp.current = key;
      runLookup(venue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue.lat, venue.lng]);

  const dated = services.filter((s) => s.date);
  const serviceDays = new Set(dated.map((s) => s.date)).size;
  const autoNights = Math.max(serviceDays - 1, 1);

  const both = useMemo(() => {
    const m = parse(miles);
    const min = parse(minutes);
    const g = parse(gasPrice);
    const dates = dated.map((s) => s.date);
    const pay = gigType === "orchestra" ? parse(feePerService) : parse(flatFee);
    if (m === null || min === null || g === null || pay === null || dates.length === 0) return null;
    const calcGig: CalcGig = {
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
      lodgingNights: parse(lodgingNights),
      eatingOut,
      meals,
      foodStipend:
        paysFoodStipend && parse(foodStipendAmount) !== null
          ? { type: foodStipendType, amount: parse(foodStipendAmount)! }
          : null,
      countDriveTime,
      serviceHours: dated.map((s) => parse(s.hours)),
      isUnion,
      pensionPct: parse(pensionPct),
    };
    const lookups = { oneWayMiles: m, oneWayMinutes: min, gasPricePerGallon: g };
    const actuals = {
      pay: parse(actualPay),
      gas: parse(actualGas),
      food: parse(actualFood),
      lodging: parse(actualLodging),
    };
    return {
      estimate: calculateGig(profile, calcGig, lookups),
      result: calculateGig(profile, { ...calcGig, actuals }, lookups),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile, gigType, feePerService, flatFee, services, paysMileage, reimbType, reimbRatePerMile,
    flatReimbAmount, stayingOvernight, hosted, roomCostPerNight, stipendPerNight, lodgingNights, eatingOut, meals, paysFoodStipend, foodStipendType, foodStipendAmount, countDriveTime, miles,
    minutes, gasPrice, isUnion, pensionPct, actualPay, actualGas, actualFood, actualLodging,
  ]);
  const preview = both?.result ?? null;
  const estimate = both?.estimate ?? null;
  const hasActuals = [actualPay, actualGas, actualFood, actualLodging].some((v) => parse(v) !== null);

  // Show "What it actually paid and cost" for a gig entered after the fact,
  // or once every date of a saved gig has passed.
  const allDatesPast = dated.length > 0 && dated.every((s) => s.date < today());
  const showActuals = alreadyPlayed || (mode.kind === "edit" && allDatesPast);

  // For a gig entered after the fact, use the gas price from the week it happened.
  const firstDate = dated.map((s) => s.date).sort()[0] ?? "";
  const gasLookedUpFor = useRef<string | null>(null);
  useEffect(() => {
    if (!alreadyPlayed || !firstDate || firstDate >= today() || gasLookedUpFor.current === firstDate) return;
    if (gasSource === null && gasPrice) return; // typed in by hand: leave it
    gasLookedUpFor.current = firstDate;
    gasPriceForDate(firstDate).then((r) => {
      if ("error" in r) return;
      setGasPrice(String(r.price));
      setGasSource({ areaName: r.areaName, periodDate: r.periodDate, kind: r.kind });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alreadyPlayed, firstDate]);

  const verdict = useMemo(
    () => preview && verdictFor(preview, dated.map((s) => s.date), client, relationship),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [preview, services, client, relationship],
  );

  // What's missing, recomputed as you type once you've tried to save.
  function findMissing(): Field[] {
    const missing: Field[] = [];
    const t = title.trim();
    if (mode.kind === "copy" && (!t || t.toLowerCase() === (copiedFromTitle ?? "").trim().toLowerCase()))
      missing.push("title");
    if ((gigType === "orchestra" ? parse(feePerService) : parse(flatFee)) === null) missing.push("fee");
    if (!venue.address.trim()) missing.push("venue");
    if (parse(miles) === null) missing.push("miles");
    if (parse(minutes) === null) missing.push("minutes");
    if (services.some((s) => !s.date)) missing.push("dates");
    if (paysMileage && reimbType === "per_mile" && parse(reimbRatePerMile) === null) missing.push("reimbRate");
    if (paysMileage && reimbType === "flat" && parse(flatReimbAmount) === null) missing.push("reimbFlat");
    if (stayingOvernight && !hosted && parse(roomCostPerNight) === null) missing.push("roomCost");
    if (paysFoodStipend && parse(foodStipendAmount) === null) missing.push("foodStipend");
    if (!parse(gasPrice)) missing.push("gasPrice");
    return missing;
  }
  const missing = triedToSave ? findMissing() : [];
  const bad = (f: Field) => missing.includes(f);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setTriedToSave(true);
    if (findMissing().length > 0) {
      // Bring the first highlighted field into view.
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>('[aria-invalid="true"]');
        el?.scrollIntoView({ block: "center", behavior: "smooth" });
        el?.focus({ preventScroll: true });
      });
      return;
    }
    startTransition(async () => {
      const input = {
        title,
        clientId: client?.id ?? null,
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
        lodgingNights,
        eatingOut,
        meals: chosenMeals,
        paysFoodStipend,
        foodStipendType,
        foodStipendAmount,
        countDriveTime,
        alreadyPlayed,
        actualPay,
        actualGas,
        actualFood,
        actualLodging,
        isUnion,
        pensionPct,
        oneWayMiles: miles,
        oneWayMinutes: minutes,
        distanceIsManual,
        gasPrice,
        gasPriceSource: gasSource ? gasSource.areaName : "Entered by hand",
        gasPriceDate: gasSource ? gasSource.periodDate : null,
        status,
      };
      const r = mode.kind === "edit" ? await updateGig(mode.gigId, input) : await createGig(input);
      if (r?.error) setError(r.error);
    });
  }

  const updateService = (i: number, patch: Partial<Service>) =>
    setServices(services.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const feeNum = parse(feePerService);
  const perServiceSum =
    gigType === "orchestra" && feeNum !== null && dated.length > 0
      ? `${dated.length} ${dated.length === 1 ? "service" : "services"} × ${formatMoney(feeNum)} = ${formatMoney(feeNum * dated.length)}`
      : null;

  return (
    <form onSubmit={submit} className="mt-6 space-y-8" noValidate>
      {mode.kind !== "edit" && (
        <div>
          <Toggle label="Already played" checked={alreadyPlayed} onChange={setAlreadyPlayed} />
          <p className="mt-1 px-1 text-xs text-stone-500">
            {alreadyPlayed
              ? "Logging a gig that's already happened: it's saved as booked, and you can enter what it actually paid and cost below."
              : "Turn on to log a gig you've already played."}
          </p>
        </div>
      )}

      <section className="space-y-3">
        <TextField
          label={mode.kind === "copy" ? "Name for this copy" : "Gig name (optional)"}
          value={title}
          onChange={setTitle}
          placeholder={
            mode.kind === "copy" && copiedFromTitle
              ? `e.g. ${copiedFromTitle} ${new Date().getFullYear() + 1}`
              : "e.g. Messiah with Hill Country Symphony"
          }
          invalid={bad("title")}
          hint={
            bad("title") && mode.kind === "copy"
              ? "Give the copy its own name, different from the original, so you can tell them apart."
              : undefined
          }
        />

        <ClientPicker clients={clients} value={client?.id ?? null} onChange={setClient} />

        <div>
          <span className="block text-sm font-medium">How are you paid?</span>
          <div className="mt-1 grid grid-cols-2 gap-2 rounded-xl bg-stone-200 p-1">
            {(
              [
                ["orchestra", "Per service", "a fee for each rehearsal and performance"],
                ["flat_fee", "One fee", "for the whole gig, however many services"],
              ] as const
            ).map(([value, label, sub]) => (
              <button
                key={value}
                type="button"
                onClick={() => setGigType(value)}
                aria-pressed={gigType === value}
                className={`rounded-lg px-3 py-2 text-center ${gigType === value ? "bg-white shadow-sm" : "text-stone-600"}`}
              >
                <span className="block font-semibold">{label}</span>
                <span className="block text-xs text-stone-500">{sub}</span>
              </button>
            ))}
          </div>
        </div>

        {gigType === "orchestra" ? (
          <MoneyField
            label="Fee per service"
            value={feePerService}
            onChange={setFeePerService}
            invalid={bad("fee")}
            hint={perServiceSum ?? "Paid for each rehearsal and performance below."}
          />
        ) : (
          <MoneyField
            label="Total fee for the whole gig"
            value={flatFee}
            onChange={setFlatFee}
            invalid={bad("fee")}
            hint="One payment, however many rehearsals and performances there are."
          />
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Where</h2>
        <div aria-invalid={bad("venue")} className={bad("venue") ? "rounded-xl ring-2 ring-red-300" : ""}>
          <AddressInput id="venue" label="Venue" value={venue} onChange={changeVenue} placeholder="Start typing the venue" />
        </div>
        {venue.address && venue.lat === null && driveStatus !== "loading" && (
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
            invalid={bad("miles")}
          />
          <TextField
            label="Minutes each way"
            value={minutes}
            onChange={(v) => {
              setMinutes(v);
              setDistanceIsManual(true);
            }}
            inputMode="numeric"
            invalid={bad("minutes")}
          />
        </div>
        {driveStatus === "found" && !distanceIsManual && driveRoute && (
          <p className="text-xs text-stone-500">
            Google Maps, from <strong>{driveRoute.from}</strong> to <strong>{driveRoute.to}</strong>. You can change
            these if you know better.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Rehearsals and performances</h2>
        <p className="text-sm text-stone-600">
          Add each one. Their dates decide how many trips you make. <strong>Hrs</strong> is how long each one lasts,
          used to work out your real hourly rate.
        </p>
        <ul className="space-y-3">
          {services.map((s, i) => (
            <li key={i} className="space-y-2 rounded-xl bg-white p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="grid flex-1 grid-cols-2 gap-1 rounded-lg bg-stone-100 p-1 text-sm">
                  {(["rehearsal", "performance"] as ServiceKind[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={s.kind === k}
                      onClick={() => updateService(i, { kind: k })}
                      className={`rounded-md py-1.5 font-medium ${s.kind === k ? "bg-white shadow-sm" : "text-stone-500"}`}
                    >
                      {k === "rehearsal" ? "Rehearsal" : "Performance"}
                    </button>
                  ))}
                </div>
                <label className="relative w-[5.5rem] shrink-0">
                  <span className="sr-only">Hours for service {i + 1}</span>
                  <input
                    className="field py-2 pl-2 pr-9 text-right"
                    inputMode="decimal"
                    value={s.hours}
                    onChange={(e) => updateService(i, { hours: e.target.value })}
                    aria-label={`Hours for service ${i + 1}`}
                  />
                  <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-sm text-stone-500">
                    hrs
                  </span>
                </label>
                {services.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remove service ${i + 1}`}
                    className="h-9 w-7 shrink-0 rounded-lg text-xl text-stone-500 active:bg-stone-200"
                    onClick={() => setServices(services.filter((_, j) => j !== i))}
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 items-start gap-2">
                <label className="min-w-0">
                  <span className={`block text-xs ${bad("dates") && !s.date ? "text-red-700" : "text-stone-500"}`}>Date</span>
                  <input
                    type="date"
                    className={`field mt-1 px-2 ${bad("dates") && !s.date ? "field-invalid" : ""}`}
                    aria-invalid={bad("dates") && !s.date}
                    value={s.date}
                    onChange={(e) => updateService(i, { date: e.target.value })}
                  />
                </label>
                <div className="min-w-0">
                  <label>
                    <span className="block text-xs text-stone-500">Start time (optional)</span>
                    <input
                      type="time"
                      className="field mt-1 px-2"
                      value={s.time}
                      onChange={(e) => updateService(i, { time: e.target.value })}
                    />
                  </label>
                  {s.time && (
                    <button type="button" className="mt-1 text-xs text-indigo-700" onClick={() => updateService(i, { time: "" })}>
                      Clear time
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="btn-secondary w-full"
          onClick={() =>
            setServices([
              ...services,
              {
                kind: services.at(-1)?.kind ?? "rehearsal",
                date: services.at(-1)?.date ?? today(),
                time: "",
                hours: services.at(-1)?.hours || defaultHours,
              },
            ])
          }
        >
          + Add a rehearsal or performance
        </button>
        <p className="text-sm text-stone-600">
          {plural(dated.filter((s) => s.kind === "rehearsal").length, "rehearsal")},{" "}
          {plural(dated.filter((s) => s.kind === "performance").length, "performance")} on{" "}
          {plural(serviceDays, "day")}
        </p>
        <p className="text-xs text-stone-500">
          Start times are only for your calendar. Leave them blank if you don&apos;t know yet.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Extras</h2>
        <Toggle label="Union gig" checked={isUnion} onChange={setIsUnion} />
        {isUnion && (
          <div className="space-y-1 rounded-xl bg-white p-3 shadow-sm">
            <label className="block">
              <span className="block text-sm font-medium">Pension contribution (optional)</span>
              <div className="relative mt-1">
                <input
                  className="field pr-8"
                  inputMode="decimal"
                  value={pensionPct}
                  onChange={(e) => setPensionPct(e.target.value)}
                  placeholder="e.g. 10"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-500">%</span>
              </div>
            </label>
            <p className="text-xs text-stone-500">
              What the employer pays into your union pension, as a % of your pay. It&apos;s money for your
              retirement rather than cash now, so it&apos;s shown separately from take-home, but it does count when
              judging if the gig is worth it.
            </p>
          </div>
        )}

        <Toggle label="They pay mileage" checked={paysMileage} onChange={setPaysMileage} />
        {paysMileage && (
          <div className="space-y-3 rounded-xl bg-white p-3 shadow-sm">
            <div className="flex gap-4">
              <Radio name="reimb" label="Per mile" checked={reimbType === "per_mile"} onChange={() => setReimbType("per_mile")} />
              <Radio name="reimb" label="Flat amount" checked={reimbType === "flat"} onChange={() => setReimbType("flat")} />
            </div>
            {reimbType === "per_mile" ? (
              <MoneyField
                label="Rate per mile"
                value={reimbRatePerMile}
                onChange={setReimbRatePerMile}
                placeholder="e.g. 0.50"
                invalid={bad("reimbRate")}
              />
            ) : (
              <MoneyField
                label="Flat mileage amount"
                value={flatReimbAmount}
                onChange={setFlatReimbAmount}
                invalid={bad("reimbFlat")}
              />
            )}
          </div>
        )}

        <Toggle label="I'm staying overnight" checked={stayingOvernight} onChange={setStayingOvernight} />
        {stayingOvernight && (
          <div className="space-y-3 rounded-xl bg-white p-3 shadow-sm">
            <TextField
              label="Number of nights"
              value={lodgingNights}
              onChange={setLodgingNights}
              inputMode="numeric"
              placeholder={String(autoNights)}
              hint={
                lodgingNights
                  ? "One round trip, however many nights you stay."
                  : `${autoNights} from your dates. Change it if you're arriving early or staying on.`
              }
            />
            <Toggle label="Hosted (room is free)" checked={hosted} onChange={setHosted} />
            {!hosted && (
              <MoneyField
                label="Room cost per night"
                value={roomCostPerNight}
                onChange={setRoomCostPerNight}
                invalid={bad("roomCost")}
              />
            )}
            <MoneyField label="Lodging stipend per night (if any)" value={stipendPerNight} onChange={setStipendPerNight} />
          </div>
        )}

        <Toggle
          label="Don't charge my drive time"
          checked={!countDriveTime}
          onChange={(on) => setCountDriveTime(!on)}
        />
        <p className="-mt-1 px-1 text-xs text-stone-500">
          {countDriveTime
            ? `Your time behind the wheel is charged at ${formatMoney(profile.drivingRate ?? profile.playingRate)}/hr and counted in your hourly rate. Turn on to leave it out for this gig.`
            : "Drive time isn't charged, and your hourly rate uses playing time only. Gas still counts."}
        </p>

        <Toggle label="Eating out" checked={eatingOut} onChange={setEatingOut} />
        {eatingOut ? (
          <div className="space-y-2 rounded-xl bg-white p-3 shadow-sm">
            <p className="text-sm font-medium">Which meals, each day?</p>
            <div className="grid grid-cols-2 gap-2">
              {MEALS.map((m) => (
                <label
                  key={m}
                  className={`flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 ${meals[m] ? "border-indigo-600 bg-indigo-50" : "border-stone-200"}`}
                >
                  <input
                    type="checkbox"
                    className="h-5 w-5 shrink-0 accent-indigo-700"
                    checked={meals[m]}
                    onChange={(e) => setChosenMeals({ ...meals, [m]: e.target.checked })}
                  />
                  <span className="min-w-0 leading-tight">
                    <span className="block">{MEAL_LABEL[m]}</span>
                    <span className="block text-xs tabular-nums text-stone-500">
                      {formatMoney(profile.mealRates?.[m] ?? 0)}
                    </span>
                  </span>
                </label>
              ))}
            </div>
            <p className="text-xs text-stone-500">
              {formatMoney(profile.mealRates ? dailyMealCost(profile.mealRates, meals) : 0)} a day,{" "}
              {stayingOvernight
                ? "for each day away including travel days."
                : "for each day with a rehearsal or performance."}{" "}
              Meal prices are in your profile.
            </p>
          </div>
        ) : (
          <p className="-mt-1 px-1 text-xs text-stone-500">
            No food cost for this gig (you&apos;re bringing your own, or meals are provided).
          </p>
        )}

        <Toggle label="They pay a food stipend" checked={paysFoodStipend} onChange={setPaysFoodStipend} />
        {paysFoodStipend && (
          <div className="space-y-3 rounded-xl bg-white p-3 shadow-sm">
            <div className="flex gap-4">
              <Radio name="foodStipend" label="Per day" checked={foodStipendType === "per_day"} onChange={() => setFoodStipendType("per_day")} />
              <Radio name="foodStipend" label="Flat amount" checked={foodStipendType === "flat"} onChange={() => setFoodStipendType("flat")} />
            </div>
            <MoneyField
              label={foodStipendType === "per_day" ? "Food stipend per day" : "Food stipend for the whole gig"}
              value={foodStipendAmount}
              onChange={setFoodStipendAmount}
              placeholder={foodStipendType === "per_day" ? "e.g. 50" : "e.g. 150"}
              invalid={bad("foodStipend")}
              hint={
                foodStipendType === "per_day"
                  ? "Paid for each day away, and added to your take-home."
                  : "Added to your take-home."
              }
            />
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
            setGasSource(null);
          }}
          invalid={bad("gasPrice")}
        />
        {gasSource && (
          <p className="text-xs text-stone-500">
            {gasSource.kind === "state"
              ? "State average"
              : gasSource.kind === "region"
                ? "Regional average"
                : gasSource.kind === "national"
                  ? "National average"
                  : "Average"}{" "}
            for {gasSource.areaName}
            {gasSource.periodDate &&
              `, week of ${formatDate(gasSource.periodDate, { weekday: undefined, year: "numeric" })}`}{" "}
            (U.S. EIA)
          </p>
        )}
        {gas && gasSource?.periodDate !== gas.periodDate && (
          <button
            type="button"
            className="text-xs text-indigo-700"
            onClick={() => {
              setGasPrice(String(gas.price));
              setGasSource(todaysGas);
            }}
          >
            Use this week&apos;s EIA average (${gas.price.toFixed(3)} for {gas.areaName})
          </button>
        )}
        {!gas && !gasSource && (
          <p className="text-sm text-amber-800">
            Couldn&apos;t get today&apos;s gas price from the EIA. Type in what you&apos;re paying.
          </p>
        )}
      </section>

      {showActuals && (
        <section id="actuals" className="scroll-mt-4 space-y-3">
          <h2 className="text-lg font-semibold">What it actually paid and cost</h2>
          <p className="text-sm text-stone-600">
            Fill in what you know. Anything left blank uses the estimate shown in grey.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <MoneyField
              label="Pay received"
              value={actualPay}
              onChange={setActualPay}
              placeholder={estimate ? estimate.totalPay.toFixed(2) : undefined}
            />
            <MoneyField
              label="Gas"
              value={actualGas}
              onChange={setActualGas}
              placeholder={estimate ? estimate.gasCost.toFixed(2) : undefined}
            />
            <MoneyField
              label="Food"
              value={actualFood}
              onChange={setActualFood}
              placeholder={estimate ? estimate.foodCost.toFixed(2) : undefined}
            />
            <MoneyField
              label="Lodging"
              value={actualLodging}
              onChange={setActualLodging}
              placeholder={estimate ? estimate.lodgingCost.toFixed(2) : undefined}
            />
          </div>
        </section>
      )}

      {preview && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">The real pay</h2>
          <ResultBreakdown
            result={preview}
            verdict={verdict}
            taxRatePct={profile.taxRatePct}
            pensionPct={isUnion ? parse(pensionPct) : null}
            estimate={hasActuals && !alreadyPlayed ? estimate : null}
          />
        </section>
      )}

      {!alreadyPlayed && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">Your decision</h2>
          {mode.kind !== "edit" && (
            <p className="text-sm text-stone-600">Optional. You can decide later from the gig&apos;s page.</p>
          )}
          <DecisionPicker value={status} onChange={setStatus} allowNone />
          {status === "taken" && initial?.status !== "taken" && (
            <p className="text-sm text-emerald-800">It&apos;ll go on your calendar when you save.</p>
          )}
        </section>
      )}

      {missing.length > 0 && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          <strong>Fill in the highlighted {missing.length === 1 ? "field" : "fields"}:</strong>{" "}
          {missing.map((f) => FIELD_LABEL[f]).join(", ")}.
        </div>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-800">{error}</p>}
      <button type="submit" className="btn-primary sticky bottom-4 w-full shadow-lg" disabled={pending}>
        {pending
          ? "Saving…"
          : mode.kind === "edit"
            ? "Save changes"
            : status === "taken"
              ? "Save and book it"
              : status === "declined"
                ? "Save as declined"
                : "Save gig"}
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
  invalid,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "decimal" | "numeric";
  invalid?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className={`block text-sm font-medium ${invalid ? "text-red-700" : ""}`}>{label}</span>
      <input
        className={`field mt-1 ${invalid ? "field-invalid" : ""}`}
        aria-invalid={invalid}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={inputMode}
      />
      {hint && <span className={`mt-1 block text-xs ${invalid ? "text-red-700" : "text-stone-500"}`}>{hint}</span>}
    </label>
  );
}

function MoneyField({
  label,
  value,
  onChange,
  placeholder,
  invalid,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  invalid?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className={`block text-sm font-medium ${invalid ? "text-red-700" : ""}`}>{label}</span>
      <div className="relative mt-1">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500">$</span>
        <input
          className={`field pl-7 ${invalid ? "field-invalid" : ""}`}
          aria-invalid={invalid}
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
