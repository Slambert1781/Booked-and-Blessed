"use client";

import { deleteClient } from "../actions";

export function DeleteClient({ id, name, gigCount }: { id: string; name: string; gigCount: number }) {
  return (
    <form
      action={deleteClient.bind(null, id)}
      onSubmit={(e) => {
        const msg =
          gigCount > 0
            ? `Delete ${name}? Their ${gigCount} ${gigCount === 1 ? "gig stays" : "gigs stay"} in your list, just without a client.`
            : `Delete ${name}?`;
        if (!confirm(msg)) e.preventDefault();
      }}
    >
      <button className="w-full rounded-lg py-3 text-red-700 active:bg-red-50">Delete client</button>
    </form>
  );
}
