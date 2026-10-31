"use client";

import { useMemo, useRef, useState } from "react";
import { TierBadge } from "@/components/TierBadge";
import { KIND_LABEL, type ClientSummary } from "@/lib/clients";
import { TIER_LABEL, TIERS, type Tier } from "@/lib/relationships";

/** Who the gig is for: an existing client, or a new one created when the gig is saved. */
export type ClientChoice = { kind: "existing"; client: ClientSummary } | { kind: "new"; name: string; tier: Tier };

// Type to search the client directory. A name that isn't there can be added
// as a new client, with a one-tap relationship tier (New Face to start).
export function ClientTypeahead({
  clients,
  value,
  onChange,
  invalid,
}: {
  clients: ClientSummary[];
  value: ClientChoice | null;
  onChange: (v: ClientChoice | null) => void;
  invalid?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? clients.filter((c) => c.name.toLowerCase().includes(q)).slice(0, 6) : clients.slice(0, 6)),
    [clients, q],
  );
  const exact = clients.some((c) => c.name.trim().toLowerCase() === q);

  function clear() {
    onChange(null);
    setQuery("");
    setTimeout(() => input.current?.focus(), 0);
  }

  if (value?.kind === "existing") {
    return (
      <div>
        <span className="block text-sm font-medium">Client</span>
        <div className="mt-1 flex items-center justify-between gap-3 rounded-lg border border-stone-300 bg-white px-3 py-2.5">
          <span className="min-w-0">
            <span className="block truncate font-semibold">{value.client.name}</span>
            <span className="block text-xs text-stone-500">{KIND_LABEL[value.client.kind]}</span>
          </span>
          <span className="flex shrink-0 items-center gap-2">
            <TierBadge tier={value.client.tier} />
            <button type="button" className="text-sm text-indigo-700" onClick={clear}>
              Change
            </button>
          </span>
        </div>
      </div>
    );
  }

  if (value?.kind === "new") {
    return (
      <div>
        <span className="block text-sm font-medium">Client</span>
        <div className="mt-1 space-y-3 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0">
              <span className="block truncate font-semibold">{value.name}</span>
              <span className="block text-xs text-indigo-800">New client: added when you save the gig</span>
            </span>
            <button type="button" className="shrink-0 text-sm text-indigo-700" onClick={clear}>
              Change
            </button>
          </div>
          <div>
            <span className="block text-xs font-medium text-stone-600">Relationship</span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {TIERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={value.tier === t}
                  onClick={() => onChange({ ...value, tier: t })}
                  className={`rounded-full border px-3 py-1.5 text-sm ${value.tier === t ? "border-indigo-700 bg-indigo-700 text-white" : "border-stone-300 bg-white text-stone-700"}`}
                >
                  {TIER_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <label htmlFor="client" className={`block text-sm font-medium ${invalid ? "text-red-700" : ""}`}>
        Client
      </label>
      <input
        ref={input}
        id="client"
        className={`field mt-1 ${invalid ? "field-invalid" : ""}`}
        aria-invalid={invalid}
        autoComplete="off"
        value={query}
        placeholder="Orchestra, church, contractor or couple"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && (matches.length > 0 || (q && !exact)) && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg">
          {matches.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left active:bg-stone-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ kind: "existing", client: c });
                  setOpen(false);
                }}
              >
                <span className="min-w-0 truncate">{c.name}</span>
                <TierBadge tier={c.tier} />
              </button>
            </li>
          ))}
          {q && !exact && (
            <li>
              <button
                type="button"
                className="block w-full border-t border-stone-100 px-3 py-3 text-left font-medium text-indigo-700 active:bg-stone-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ kind: "new", name: query.trim(), tier: "new_face" });
                  setOpen(false);
                }}
              >
                Add &lsquo;{query.trim()}&rsquo; as a new client
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
