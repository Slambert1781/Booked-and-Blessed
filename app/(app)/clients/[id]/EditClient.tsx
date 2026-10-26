"use client";

import { useState } from "react";
import { ClientForm } from "@/components/ClientForm";
import type { ClientRow } from "@/lib/clients";
import type { TierDiscounts } from "@/lib/relationships";

export function EditClient(props: { client: ClientRow; discounts: TierDiscounts; minHourlyRate: number | null }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" className="btn-secondary w-full py-2 text-sm" onClick={() => setOpen(true)}>
        Edit client or change tier
      </button>
    );
  }
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <ClientForm {...props} onSaved={() => setOpen(false)} />
      <button type="button" className="mt-3 w-full text-sm text-stone-500" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </div>
  );
}
