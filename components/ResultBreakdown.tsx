import type { GigResult } from "@/lib/calculateGig";
import { formatHours, formatMiles, formatMoney } from "@/lib/format";

// The result screen's breakdown. Used for the live preview and saved gigs.
export function ResultBreakdown({
  result,
  minHourlyRate,
  taxRatePct,
  pensionPct,
}: {
  result: GigResult;
  minHourlyRate?: number | null;
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
          from {formatMoney(r.totalPay)} pay, after travel
        </p>
      </div>

      <HourlyRate result={r} minHourlyRate={minHourlyRate ?? null} />

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
      </dl>

      {(r.taxSetAside > 0 || r.pensionContribution > 0) && (
        <dl className="divide-y divide-stone-200 rounded-2xl bg-white px-4 shadow-sm">
          {r.taxSetAside > 0 && (
            <Row
              label={`Set aside for taxes${taxRatePct ? ` (${taxRatePct}%)` : ""}`}
              detail="Put this away from the pay. It isn't taken off your take-home above."
              value={formatMoney(r.taxSetAside)}
            />
          )}
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

function HourlyRate({ result: r, minHourlyRate }: { result: GigResult; minHourlyRate: number | null }) {
  if (r.realHourlyRate === null) {
    return (
      <p className="rounded-2xl bg-white px-4 py-3 text-sm text-stone-500 shadow-sm">
        Add how many hours each service lasts to see your real hourly rate.
      </p>
    );
  }
  const verdict =
    r.meetsMinimum === null ? null : r.meetsMinimum ? (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-900">
        ✓ Above your {formatMoney(minHourlyRate!)}/hr minimum
      </span>
    ) : (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-900">
        ✗ Below your {formatMoney(minHourlyRate!)}/hr minimum
      </span>
    );
  return (
    <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p>
          <span className="text-2xl font-bold tabular-nums">{formatMoney(r.realHourlyRate)}</span>
          <span className="text-stone-600">/hr real</span>
        </p>
        {verdict}
      </div>
      <p className="mt-1 text-xs text-stone-500">
        Over {formatHours(r.totalHours)}: {formatHours(r.playingHours)} playing + {formatHours(r.totalDriveHours)}{" "}
        driving, after gas and lodging.
      </p>
    </div>
  );
}
