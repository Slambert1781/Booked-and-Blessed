"use client";

import { useState, useTransition } from "react";
import { addClient } from "@/app/(app)/clients/actions";
import { CLIENT_KINDS, KIND_LABEL, type ClientKind, type ClientSummary } from "@/lib/clients";
import { TIER_LABEL, TIERS, type Tier } from "@/lib/relationships";

const NEW = "__new__";

// Choose who the gig is for, or add a new client without leaving the form.
export function ClientPicker({
  clients: initialClients,
  value,
  onChange,
}: {
  clients: ClientSummary[];
  value: string | null;
  onChange: (client: ClientSummary | null) => void;
}) {
  const [clients, setClients] = useState(initialClients);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ClientKind>("orchestra");
  const [tier, setTier] = useState<Tier>("new_face");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const r = await addClient({ name, kind, tier });
      if ("error" in r) {
        setError(r.error);
        return;
      }
      setClients([...clients, r.client].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(r.client);
      setAdding(false);
      setName("");
    });
  }

  return (
    <div className="space-y-2">
      <label className="block">
        <span className="block text-sm font-medium">Client (optional)</span>
        <select
          className="field mt-1"
          value={adding ? NEW : (value ?? "")}
          onChange={(e) => {
            if (e.target.value === NEW) {
              setAdding(true);
              return;
            }
            setAdding(false);
            onChange(clients.find((c) => c.id === e.target.value) ?? null);
          }}
        >
          <option value="">No client / one-off</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} · {TIER_LABEL[c.tier]}
            </option>
          ))}
          <option value={NEW}>+ New client…</option>
        </select>
        <span className="mt-1 block text-xs text-stone-500">
          The orchestra, church, contractor or couple. Their relationship tier adjusts your minimum rate.
        </span>
      </label>

      {adding && (
        <div className="space-y-3 rounded-xl bg-white p-3 shadow-sm">
          <label className="block">
            <span className="block text-sm font-medium">Name</span>
            <input className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Willamette Symphony" />
          </label>
          <div className="grid grid-cols-2 gap-2">
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
            <label className="block">
              <span className="block text-sm font-medium">Relationship</span>
              <select className="field mt-1" value={tier} onChange={(e) => setTier(e.target.value as Tier)}>
                {TIERS.map((t) => (
                  <option key={t} value={t}>
                    {TIER_LABEL[t]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {error && <p className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn-secondary flex-1 py-2 text-sm" onClick={() => setAdding(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary flex-1 py-2 text-sm" disabled={pending} onClick={save}>
              {pending ? "Adding…" : "Add client"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
