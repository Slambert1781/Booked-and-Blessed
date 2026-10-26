import { TIER_LABEL, type Tier } from "@/lib/relationships";

const STYLE: Record<Tier, string> = {
  new_face: "bg-stone-200 text-stone-700",
  familiar: "bg-sky-100 text-sky-900",
  faithful: "bg-indigo-100 text-indigo-900",
  favored: "bg-violet-100 text-violet-900",
  highly_favored: "bg-amber-100 text-amber-900",
};

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLE[tier]}`}>
      {tier === "highly_favored" ? "★ " : ""}
      {TIER_LABEL[tier]}
    </span>
  );
}
