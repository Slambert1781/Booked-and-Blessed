import type { GigResult } from "@/lib/calculateGig";
import { describeMeals } from "@/lib/meals";
import type { VerdictResult } from "@/lib/relationships";
import { formatHours, formatMiles, formatMoney } from "@/lib/format";

// The result screen's breakdown. Used for the live preview and saved gigs.
export function ResultBreakdown({
  result,
  verdict,
  taxRatePct,
  pensionPct,
  estimate,
}: {
  result: GigResult;
  /** The estimate before actual figures were entered; shows a comparison when given. */
  estimate?: GigResult | null;
  verdict?: VerdictResult | null;
  taxRatePct?: number | null;
  pensionPct?: number | null;
}) {
  const r = result;
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
        <Row label="Total pay" value={formatMoney(r.totalPay)} actual={r.actual.pay} />
        {r.mileageReimbursement > 0 && (
          <Row label="Mileage reimbursement" value={`+ ${formatMoney(r.mileageReimbursement)}`} positive />
        )}
        {r.foodStipend > 0 && (
          <Row label="Food stipend" value={`+ ${formatMoney(r.foodStipend)}`} positive />
        )}
        {r.lodgingStipend > 0 && (
          <Row
            label={`Lodging stipend (${r.nights} ${r.nights === 1 ? "night" : "nights"})`}
            value={`+ ${formatMoney(r.lodgingStipend)}`}
            positive
          />
        )}
        <Row label="Gas" value={`− ${formatMoney(r.gasCost)}`} negative actual={r.actual.gas} />
        {(r.lodgingCost > 0 || r.actual.lodging) && (
          <Row
            label={`Lodging (${r.nights} ${r.nights === 1 ? "night" : "nights"})`}
            value={`− ${formatMoney(r.lodgingCost)}`}
            negative
            actual={r.actual.lodging}
          />
        )}
        {(r.foodCost > 0 || r.actual.food) && (
          <Row
            label="Food"
            detail={
              r.actual.food
                ? undefined
                : `${r.foodDays} ${r.foodDays === 1 ? "day" : "days"} × ${formatMoney(r.foodRate)} (${describeMeals(r.meals)})`
            }
            value={`− ${formatMoney(r.foodCost)}`}
            negative
            actual={r.actual.food}
          />
        )}
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

      {estimate && <CompareWithEstimate actual={r} estimate={estimate} />}

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
  actual,
}: {
  label: string;
  detail?: string;
  value: string;
  positive?: boolean;
  negative?: boolean;
  /** An actual figure entered after the gig, rather than an estimate. */
  actual?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt>
        {label}
        {actual && (
          <span className="ml-2 rounded-full bg-indigo-100 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-indigo-800">
            actual
          </span>
        )}
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
      {style && <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.chip}`}>{style.label}</span>}
      {verdict && <p className="mt-2 text-sm text-stone-800">{verdict.explanation}</p>}

      {verdict && r.playingHours > 0 && (
        <dl className="mt-3 space-y-1 border-t border-black/10 pt-3 text-sm tabular-nums">
          <TimeRow
            label={`Playing: ${formatHours(r.playingHours)} × ${formatMoney(verdict.effectiveMin)}`}
            value={formatMoney(verdict.playingValue)}
          />
          {r.driveTimeCounted ? (
            <TimeRow
              label={`Driving: ${formatHours(r.totalDriveHours)} × ${formatMoney(r.driveTimeRate)}`}
              value={formatMoney(verdict.drivingValue)}
            />
          ) : (
            <TimeRow label={`Driving: ${formatHours(r.totalDriveHours)}, not counted for this gig`} value="—" />
          )}
          <TimeRow label="Your time is worth" value={formatMoney(verdict.timeValue)} strong />
          <TimeRow label="Your real take-home" value={formatMoney(r.realTakeHome)} />
          <TimeRow
            label="Difference"
            value={`${verdict.gap >= 0 ? "+" : "−"} ${formatMoney(Math.abs(verdict.gap))}`}
            strong
          />
        </dl>
      )}

      {r.realHourlyRate !== null ? (
        <p className="mt-3 text-xs text-stone-500">
          Real hourly rate: <strong className="text-stone-700">{formatMoney(r.realHourlyRate)}/hr</strong>
          {r.driveTimeCounted
            ? ` over ${formatHours(r.totalHours)} (${formatHours(r.playingHours)} playing + ${formatHours(r.totalDriveHours)} driving)`
            : ` over ${formatHours(r.playingHours)} of playing (drive time not counted)`}
          , after gas, lodging and food, before tax.
        </p>
      ) : (
        <p className="mt-1 text-sm text-stone-500">
          Add how many hours each service lasts to see your real hourly rate.
        </p>
      )}
    </div>
  );
}

function TimeRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${strong ? "font-semibold" : "text-stone-700"}`}>
      <dt className="min-w-0">{label}</dt>
      <dd className="shrink-0">{value}</dd>
    </div>
  );
}

// Estimated vs actual, behind a tap.
function CompareWithEstimate({ actual: a, estimate: e }: { actual: GigResult; estimate: GigResult }) {
  const rows: [string, number, number][] = [
    ["Pay", e.totalPay, a.totalPay],
    ["Gas", e.gasCost, a.gasCost],
    ["Food", e.foodCost, a.foodCost],
    ["Lodging", e.lodgingCost, a.lodgingCost],
    ["Take-home", e.realTakeHome, a.realTakeHome],
  ];
  const diff = a.realTakeHome - e.realTakeHome;
  // The line that moved take-home the most (costs count against you).
  const swings: [string, number][] = [
    ["the pay", a.totalPay - e.totalPay],
    ["gas", e.gasCost - a.gasCost],
    ["food", e.foodCost - a.foodCost],
    ["lodging", e.lodgingCost - a.lodgingCost],
  ];
  const [why] = [...swings].sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
  const summary =
    Math.abs(diff) < 0.5
      ? "You took home what you expected."
      : `You took home ${formatMoney(Math.abs(diff))} ${diff > 0 ? "more" : "less"} than expected${
          Math.abs(why[1]) >= 0.5 ? `, mostly because of ${why[0]}` : ""
        }.`;

  return (
    <details className="group rounded-2xl bg-white px-4 py-3 shadow-sm">
      <summary className="cursor-pointer list-none text-sm font-medium text-indigo-700">
        <span className="group-open:hidden">Compare with your estimate</span>
        <span className="hidden group-open:inline">Hide the comparison</span>
      </summary>
      <p className="mt-3 text-sm text-stone-700">{summary}</p>
      <table className="mt-2 w-full text-sm tabular-nums">
        <thead>
          <tr className="text-left text-xs text-stone-500">
            <th className="py-1 font-medium"></th>
            <th className="py-1 text-right font-medium">Estimated</th>
            <th className="py-1 text-right font-medium">Actual</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100">
          {rows.map(([label, est, act]) => (
            <tr key={label} className={label === "Take-home" ? "font-semibold" : ""}>
              <td className="py-1.5">{label}</td>
              <td className="py-1.5 text-right text-stone-500">{formatMoney(est)}</td>
              <td className="py-1.5 text-right">{formatMoney(act)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </details>
  );
}
