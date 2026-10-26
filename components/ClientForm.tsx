"use client";

import { useState, useTransition } from "react";
import { createClientAndOpen, updateClient } from "@/app/(app)/clients/actions";
import { CLIENT_KINDS, KIND_LABEL, type ClientKind, type ClientRow } from "@/lib/clients";
import { formatMoney } from "@/lib/format";
import { TIER_EXAMPLE, TIER_LABEL, TIERS, type Tier, type TierDiscounts } from "@/lib/relationships";

// Add or edit a client. The tier list shows what each tier does to your
// minimum hourly rate, using your own discounts.
export function ClientForm({
  client,
  discounts,
  minHourlyRate,
  onSaved,
}: {
  client?: ClientRow;
  discounts: TierDiscounts;
  minHourlyRate: number | null;
  onSaved?: () => void;
}) {
  const [name, setName] = useState(client?.name ?? "");
  const [kind, setKind] = useState<ClientKind>(client?.kind ?? "orchestra");
  const [tier, setTier] = useState<Tier>(client?.tier ?? "new_face");
  const [notes, setNotes] = useState(client?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const input = { name, kind, tier, notes };
      const r = client ? await updateClient(client.id, input) : await createClientAndOpen(input);
      if (r?.error) setError(r.error);
      else onSaved?.();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <label className="block">
        <span className="block text-sm font-medium">Name</span>
        <input
          className="field mt-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Willamette Symphony"
          required
        />
      </label>

      <label className="block">
        <span className="block text-sm font-medium">Kind</span>
        <select className="field mt-1" value={kind} onChange={(e) => setKind(e.target.value as ClientKind)}>
          {CLIENT_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="text-sm font-medium">Relationship</legend>
        <div className="mt-2 space-y-2">
          {TIERS.map((t) => (
            <label
              key={t}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 ${tier === t ? "border-indigo-600 bg-indigo-50" : "border-stone-200 bg-white"}`}
            >
              <input
                type="radio"
                name="tier"
                className="h-5 w-5 accent-indigo-700"
                checked={tier === t}
                onChange={() => setTier(t)}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{TIER_LABEL[t]}</span>
                <span className="block text-xs text-stone-500">{TIER_EXAMPLE[t]}</span>
              </span>
              <span className="shrink-0 text-right text-sm">
                <span className="block font-medium">{discounts[t]}% off</span>
                {minHourlyRate !== null && (
                  <span className="block text-xs text-stone-500 tabular-nums">
                    {formatMoney(minHourlyRate * (1 - discounts[t] / 100))}/hr
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
        {minHourlyRate === null && (
          <p className="mt-2 text-xs text-stone-500">
            Set a minimum hourly rate in your profile to see what each tier means in dollars.
          </p>
        )}
      </fieldset>

      <label className="block">
        <span className="block text-sm font-medium">Notes (optional)</span>
        <textarea
          className="field mt-1 min-h-24"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Contact, what they usually pay, parking tips…"
        />
      </label>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-800">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Saving…" : client ? "Save changes" : "Add client"}
      </button>
    </form>
  );
}
