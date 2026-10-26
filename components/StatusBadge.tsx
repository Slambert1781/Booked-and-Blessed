import { STATUS_LABEL, type GigStatus } from "@/lib/gigs";

const STYLE: Record<GigStatus, string> = {
  undecided: "bg-amber-100 text-amber-900",
  taken: "bg-emerald-100 text-emerald-900",
  declined: "bg-stone-200 text-stone-600",
};

export function StatusBadge({ status, played }: { status: GigStatus; played?: boolean }) {
  if (played) {
    return (
      <span className="inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-900">
        Played
      </span>
    );
  }
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${STYLE[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
