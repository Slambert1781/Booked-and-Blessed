"use client";

import { useRef, useState } from "react";
import { lookupDrive } from "@/app/(app)/gigs/new/actions";
import { AddressInput, type AddressValue } from "@/components/AddressInput";
import type { ServiceLocation as Location } from "@/lib/gigForm";

const short = (address: string) => address.split(",")[0];

// "At [venue] · Change": lets one rehearsal or performance be somewhere else,
// looking up its own drive from home.
export function ServiceLocation({
  id,
  venueLabel,
  value,
  onChange,
}: {
  id: string;
  /** How the gig's venue is shown, e.g. "LaSells Stewart Center". */
  venueLabel: string;
  value: Location | null;
  onChange: (v: Location | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [place, setPlace] = useState<AddressValue>({ address: "", lat: null, lng: null, state: null });
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const lookupId = useRef(0);

  async function pick(v: AddressValue) {
    setPlace(v);
    if (v.lat === null || v.lng === null) return; // wait for a suggestion to be picked
    const n = ++lookupId.current;
    setStatus("loading");
    const r = await lookupDrive({ address: v.address, lat: v.lat, lng: v.lng });
    if (n !== lookupId.current) return;
    const location: Location = {
      address: v.address,
      lat: v.lat,
      lng: v.lng,
      name: v.name ?? null,
      miles: "error" in r ? "" : r.miles.toFixed(1),
      minutes: "error" in r ? "" : String(Math.round(r.minutes)),
    };
    setStatus("error" in r ? "error" : "idle");
    onChange(location);
    if (!("error" in r)) setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-lg bg-stone-50 p-2">
        <AddressInput
          id={id}
          label="Where is this one?"
          value={place}
          onChange={pick}
          placeholder="Start typing, then pick from the list"
        />
        {status === "loading" && <p className="text-xs text-stone-500">Working out the drive…</p>}
        {status === "error" && (
          <p className="text-xs text-amber-800">
            Couldn&apos;t find a driving route. Type the miles and minutes in See the assumptions.
          </p>
        )}
        <div className="flex gap-4 text-xs">
          <button
            type="button"
            className="text-indigo-700"
            onClick={() => {
              onChange(null);
              setEditing(false);
            }}
          >
            Use the gig&apos;s venue
          </button>
          <button type="button" className="text-stone-500" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <p className="flex items-center justify-between gap-2 text-xs text-stone-500">
      <span className="min-w-0 truncate">
        📍 At{" "}
        <strong className={value ? "text-indigo-800" : "text-stone-600"}>
          {value ? value.name || short(value.address) : venueLabel}
        </strong>
        {value && value.miles && ` · ${value.miles} mi each way`}
      </span>
      <button
        type="button"
        className="shrink-0 text-indigo-700"
        onClick={() => {
          setPlace({ address: "", lat: null, lng: null, state: null });
          setStatus("idle");
          setEditing(true);
        }}
      >
        {value ? "Change" : "Somewhere else?"}
      </button>
    </p>
  );
}
