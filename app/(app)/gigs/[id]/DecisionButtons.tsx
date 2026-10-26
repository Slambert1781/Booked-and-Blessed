"use client";

import { useState, useTransition } from "react";
import { DecisionPicker } from "@/components/DecisionPicker";
import type { GigStatus } from "@/lib/gigs";
import { setGigStatus } from "./actions";

export function DecisionButtons({ gigId, status }: { gigId: string; status: GigStatus }) {
  const [current, setCurrent] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(next: GigStatus | null) {
    if (!next || next === current) return;
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
        {current === "undecided" ? "Your decision" : current === "taken" ? "You booked this gig" : "You declined this gig"}
      </p>
      <div className="mt-2">
        <DecisionPicker value={current} onChange={choose} disabled={pending} />
      </div>
      {current === "taken" && <p className="mt-2 text-sm text-emerald-800">It&apos;s on your calendar.</p>}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
