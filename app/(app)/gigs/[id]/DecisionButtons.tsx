"use client";

import { useState, useTransition } from "react";
import type { GigStatus } from "@/lib/gigs";
import { setGigStatus } from "./actions";

const OPTIONS: { value: GigStatus; label: string; on: string }[] = [
  { value: "taken", label: "Take it", on: "bg-emerald-600 text-white border-emerald-600" },
  { value: "declined", label: "Decline", on: "bg-stone-700 text-white border-stone-700" },
  { value: "undecided", label: "Undecided", on: "bg-amber-400 text-amber-950 border-amber-400" },
];

export function DecisionButtons({ gigId, status }: { gigId: string; status: GigStatus }) {
  const [current, setCurrent] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(next: GigStatus) {
    if (next === current) return;
    const previous = current;
    setCurrent(next);
    setError(null);
    startTransition(async () => {
      const r = await setGigStatus(gigId, next);
      if (r?.error) {
        setCurrent(previous);
        setError(r.error);
      }
    });
  }

  return (
    <div>
      <p className="text-sm font-medium text-stone-600">
        {current === "undecided" ? "Your decision" : current === "taken" ? "You took this gig" : "You declined this gig"}
      </p>
      <div className="mt-2 grid grid-cols-3 gap-2" aria-busy={pending}>
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => choose(o.value)}
            aria-pressed={current === o.value}
            className={`rounded-lg border px-2 py-3 font-semibold ${current === o.value ? o.on : "border-stone-300 bg-white text-stone-800 active:bg-stone-100"}`}
          >
            {o.label}
          </button>
        ))}
      </div>
      {current === "taken" && (
        <p className="mt-2 text-sm text-emerald-800">It&apos;s on your calendar.</p>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
