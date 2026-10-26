"use client";

import { deleteGig } from "@/app/(app)/gigs/[id]/actions";

// Delete a gig, after a confirmation (it can't be undone).
export function DeleteGigButton({ gigId, name }: { gigId: string; name: string }) {
  return (
    <form
      action={deleteGig.bind(null, gigId)}
      onSubmit={(e) => {
        if (!confirm(`Delete "${name}"? This can't be undone.`)) e.preventDefault();
      }}
    >
      <button className="w-full rounded-lg py-3 text-red-700 active:bg-red-50">Delete this gig</button>
    </form>
  );
}
