import type { GigResult } from "@/lib/calculateGig";
import type { VerdictResult } from "@/lib/relationships";
import { formatHours, formatMiles, formatMoney } from "@/lib/format";

// The result screen's breakdown. Used for the live preview and saved gigs.
export function ResultBreakdown({
  result,
  verdict,
  taxRatePct,
  pensionPct,
}: {
  result: GigResult;
  verdict?: VerdictResult | null;
  taxRatePct?: number | null;
  pensionPct?: number | null;
}) {
  const r = result;
  const hourly = r.totalDriveHours > 0 ? r.driveTimeRate : null;
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-indigo-700 px-5 py-6 text-white">
        <p className="text-sm uppercase tracking-wide text-indigo-200">Your real take-home</p>
        <p className={`mt-1 text-5xl font-bold tabular-nums ${r.realTakeHome < 0 ? "text-red-200" : ""}`}>
          {formatMoney(r.realTakeHome)}
        </p>
        <p className="mt-2 text-sm text-indigo-100">
          from {formatMoney(r.totalPay)} pay, after travel{r.taxSetAside > 0 ? " and taxes" : ""}
        </p>
      </div>

      <HourlyRate result={r} verdict={verdict ?? null} />

      <dl className="divide-y divide-stone-200 rounded-2xl bg-white px-4 shadow-sm">
        <Row label="Total pay" value={formatMoney(r.totalPay)} />
        {r.mileageReimbursement > 0 && (
          <Row label="Mileage reimbursement" value={`+ ${formatMoney(r.mileageReimbursement)}`} positive />
        )}
        {r.lodgingStipend > 0 && (
          <Row
            label={`Lodging stipend (${r.nights} ${r.nights === 1 ? "night" : "nights"})`}
            value={`+ ${formatMoney(r.lodgingStipend)}`}
            positive
          />
        )}
        <Row label="Gas" value={`− ${formatMoney(r.gasCost)}`} negative />
        {r.lodgingCost > 0 && (
          <Row
            label={`Lodging (${r.nights} ${r.nights === 1 ? "night" : "nights"})`}
            value={`− ${formatMoney(r.lodgingCost)}`}
            negative
          />
        )}
        <Row
          label="Your drive time"
          detail={hourly !== null ? `${formatHours(r.totalDriveHours)} at ${formatMoney(hourly)}/hr` : undefined}
          value={`− ${formatMoney(r.driveTimeCost)}`}
          negative
        />
        {r.taxSetAside > 0 && (
          <Row
            label={`Taxes${taxRatePct ? ` (${taxRatePct}% of pay)` : ""}`}
            detail="Set this aside from the pay for your tax bill."
            value={`− ${formatMoney(r.taxSetAside)}`}
            negative
          />
        )}
      </dl>

      {r.pensionContribution > 0 && (
        <dl className="divide-y divide-stone-200 rounded-2xl bg-white px-4 shadow-sm">
          {r.pensionContribution > 0 && (
            <Row
              label={`Union pension${pensionPct ? ` (${pensionPct}%)` : ""}`}
              detail="Paid into your pension by the employer, on top of your pay."
              value={`+ ${formatMoney(r.pensionContribution)}`}
              positive
            />
          )}
        </dl>
      )}

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Round trips" value={String(r.roundTrips)} />
        <Stat label="Total miles" value={formatMiles(r.totalMiles)} />
        <Stat label="Drive time" value={formatHours(r.totalDriveHours)} />
      </dl>
    </div>
  );
}

function Row({
  label,
  detail,
  value,
  positive,
  negative,
}: {
  label: string;
  detail?: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt>
        {label}
        {detail && <span className="block text-xs text-stone-500">{detail}</span>}
      </dt>
      <dd
        className={`shrink-0 whitespace-nowrap tabular-nums font-medium ${positive ? "text-emerald-700" : ""} ${negative ? "text-stone-700" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-2 py-3 shadow-sm">
      <dd className="font-semibold tabular-nums">{value}</dd>
      <dt className="text-xs text-stone-500">{label}</dt>
    </div>
  );
}

const VERDICT_STYLE = {
  green: { box: "border-emerald-300 bg-emerald-50", chip: "bg-emerald-600 text-white", label: "Worth it" },
  yellow: { box: "border-amber-300 bg-amber-50", chip: "bg-amber-400 text-amber-950", label: "Close call" },
  red: { box: "border-red-300 bg-red-50", chip: "bg-red-600 text-white", label: "Not worth it" },
} as const;

function HourlyRate({ result: r, verdict }: { result: GigResult; verdict: VerdictResult | null }) {
  const style = verdict ? VERDICT_STYLE[verdict.verdict] : null;
  return (
    <div className={`rounded-2xl border px-4 py-3 shadow-sm ${style ? style.box : "border-transparent bg-white"}`}>
      {r.realHourlyRate !== null ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p>
            <span className="text-2xl font-bold tabular-nums">{formatMoney(r.realHourlyRate)}</span>
            <span className="text-stone-600">/hr real</span>
          </p>
          {style && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.chip}`}>{style.label}</span>}
        </div>
      ) : (
        style && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.chip}`}>{style.label}</span>
      )}
      {verdict && <p className="mt-2 text-sm text-stone-800">{verdict.explanation}</p>}
      {r.realHourlyRate !== null ? (
        <p className="mt-1 text-xs text-stone-500">
          Over {formatHours(r.totalHours)}: {formatHours(r.playingHours)} playing + {formatHours(r.totalDriveHours)}{" "}
          driving, after gas and lodging.
        </p>
      ) : (
        <p className="mt-1 text-sm text-stone-500">
          Add how many hours each service lasts to see your real hourly rate.
        </p>
      )}
    </div>
  );
}
