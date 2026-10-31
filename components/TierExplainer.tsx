import { formatMoney } from "@/lib/format";
import { rushTier, TIER_EXAMPLE, TIER_LABEL, TIERS, type TierDiscounts } from "@/lib/relationships";

// "How relationship tiers work", with a worked example in dollars.
export function TierExplainer({
  discounts,
  minHourlyRate,
  open,
}: {
  discounts: TierDiscounts;
  minHourlyRate: number | null;
  open?: boolean;
}) {
  const min = minHourlyRate ?? 40;
  const minFor = (t: (typeof TIERS)[number]) => min * (1 - discounts[t] / 100);
  // Worked example: $280 take-home for 8 hours of playing and 3 of driving ($25/hr).
  const takeHome = 280;
  const playingHours = 8;
  const drivingValue = 3 * 25;
  const timeValue = (m: number) => playingHours * m + drivingValue;
  const colour = (m: number) => {
    const gap = takeHome - timeValue(m);
    return gap >= 0 ? "green" : -gap <= timeValue(m) * 0.15 ? "yellow" : "red";
  };
  const dot = { green: "bg-emerald-500", yellow: "bg-amber-400", red: "bg-red-500" } as const;

  return (
    <details open={open} className="group rounded-2xl bg-white p-4 shadow-sm">
      <summary className="cursor-pointer list-none font-semibold">
        How relationship tiers work <span className="text-indigo-700 group-open:hidden">· Show</span>
      </summary>
      <div className="mt-3 space-y-3 text-sm text-stone-700">
        <p>
          Not every gig is only about the money. An orchestra that hires you every season is worth keeping happy even
          when one gig pays a little less. Each client gets a tier, and each tier lowers your minimum hourly rate for
          their gigs. The app values your playing time at that minimum, adds your driving time, and checks whether
          your take-home covers it.
        </p>
        <p className="rounded-xl bg-stone-50 p-3">
          <strong>Example:</strong> a <strong>$400</strong> concert set takes 8 hours of rehearsing and playing plus 3
          hours of driving (worth $75 at $25/hr). After gas, food and taxes you take home{" "}
          <strong>{formatMoney(takeHome)}</strong>. Your time is worth 8 hours at your minimum for the client, plus the
          $75 of driving.
          {minHourlyRate === null && " With a $40 minimum:"}
        </p>
        <ul className="divide-y divide-stone-100">
          {TIERS.map((t) => {
            const c = colour(minFor(t));
            return (
              <li key={t} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block font-medium">{TIER_LABEL[t]}</span>
                  <span className="block text-xs text-stone-500">{TIER_EXAMPLE[t]}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2 tabular-nums">
                  <span className="text-right">
                    <span className="block">{formatMoney(minFor(t))}/hr</span>
                    <span className="block text-xs text-stone-500">
                      {discounts[t]}% off · time worth {formatMoney(timeValue(minFor(t)))}
                    </span>
                  </span>
                  <span className={`h-3 w-3 rounded-full ${dot[c]}`} aria-label={c} />
                </span>
              </li>
            );
          })}
        </ul>
        <p>
          So the same gig is <strong className="text-red-700">red</strong> for a stranger but{" "}
          <strong className="text-emerald-700">green</strong> for your {TIER_LABEL.highly_favored} orchestra.
          Yellow means your take-home falls short of what your time is worth by no more than 15%: a close call.
        </p>
        <p>
          <strong>Holiday Rush</strong> (Oct 1 – Dec 31 unless you change it): every client counts as one tier lower,
          so in December your {TIER_LABEL.highly_favored} orchestra is treated as{" "}
          {TIER_LABEL[rushTier("highly_favored")]} and the example above becomes{" "}
          <strong>{colour(minFor(rushTier("highly_favored")))}</strong>.
        </p>
        <p>
          <strong>Hard floor:</strong> a gig that leaves you nothing after gas, lodging, food and taxes is always red. Loyalty shouldn&apos;t
          mean paying to play.
        </p>
      </div>
    </details>
  );
}
