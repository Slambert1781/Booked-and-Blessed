"use client";

import { useState, useTransition } from "react";
import { DecisionPicker } from "@/components/DecisionPicker";
import type { GigStatus } from "@/lib/gigs";
import { setGigStatus } from "./actions";

const SAVED_TEXT: Record<GigStatus, string> = {
  undecided: "Not decided yet",
  taken: "You booked this gig. It's on your calendar.",
  declined: "You declined this gig",
};

// Choose Book it / Decline / Undecided, then tap Save.
export function DecisionButtons({ gigId, status }: { gigId: string; status: GigStatus }) {
  const [saved, setSaved] = useState(status);
  const [choice, setChoice] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const changed = choice !== saved;

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await setGigStatus(gigId, choice);
      if (r?.error) {
        setError(r.error);
        return;
      }
      setSaved(choice);
      setJustSaved(true);
    });
  }

  return (
    <div>
      <h2 className="text-lg font-semibold">Your decision</h2>
      <div className="mt-2">
        <DecisionPicker
          value={choice}
          onChange={(v) => {
            if (v) setChoice(v);
            setJustSaved(false);
          }}
          disabled={pending}
        />
      </div>
      {changed ? (
        <button type="button" className="btn-primary mt-3 w-full" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save decision"}
        </button>
      ) : (
        <p className={`mt-2 text-sm ${saved === "taken" ? "text-emerald-800" : "text-stone-600"}`}>
          {justSaved ? "✓ Saved. " : ""}
          {SAVED_TEXT[saved]}
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
