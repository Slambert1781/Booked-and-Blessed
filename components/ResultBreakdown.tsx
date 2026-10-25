import type { GigResult } from "@/lib/calculateGig";
import { formatHours, formatMiles, formatMoney } from "@/lib/format";

// The result screen's breakdown. Used for the live preview and saved gigs.
export function ResultBreakdown({ result }: { result: GigResult }) {
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
        className={`tabular-nums font-medium ${positive ? "text-emerald-700" : ""} ${negative ? "text-stone-700" : ""}`}
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
