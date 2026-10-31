"use client";

import { useEffect, useRef, useState } from "react";

export type AddressValue = {
  address: string;
  lat: number | null;
  lng: number | null;
  state: string | null;
  /** The place's name, e.g. "First Presbyterian Church" (venues picked from suggestions). */
  name?: string | null;
};

type Suggestion = { placeId: string; text: string };

// Address field with Google Places suggestions (via our server routes).
// If suggestions are unavailable, the typed text is still kept.
export function AddressInput({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: AddressValue;
  onChange: (v: AddressValue) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState(value.address);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const session = useRef<string>(crypto.randomUUID());
  const skipNext = useRef(true);

  // Follow changes made from outside, e.g. a venue filled in from the client's last gig.
  useEffect(() => {
    if (value.address !== query) {
      skipNext.current = true;
      setQuery(value.address);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.address]);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    if (query.trim().length < 3 || unavailable) {
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const q = new URLSearchParams({ input: query, session: session.current });
        const res = await fetch(`/api/places/autocomplete?${q}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error();
        const data = (await res.json()) as { suggestions: Suggestion[] };
        setSuggestions(data.suggestions);
        setOpen(true);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setUnavailable(true);
      }
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, unavailable]);

  async function pick(s: Suggestion) {
    skipNext.current = true;
    setQuery(s.text);
    setOpen(false);
    setSuggestions([]);
    onChange({ address: s.text, lat: null, lng: null, state: null });
    try {
      const q = new URLSearchParams({ id: s.placeId, session: session.current });
      const res = await fetch(`/api/places/details?${q}`);
      if (!res.ok) throw new Error();
      const d = (await res.json()) as { address: string; lat: number; lng: number; state: string | null };
      skipNext.current = true;
      setQuery(d.address);
      onChange({ address: d.address, lat: d.lat, lng: d.lng, state: d.state });
    } catch {
      // Keep the text; distance can still be entered by hand.
    }
    session.current = crypto.randomUUID();
  }

  return (
    <div className="relative">
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        className="field mt-1"
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          onChange({ address: e.target.value, lat: null, lng: null, state: value.state });
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => suggestions.length && setOpen(true)}
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-stone-200 bg-white shadow-lg">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                className="block w-full px-3 py-3 text-left text-sm active:bg-stone-100"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(s)}
              >
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
      {unavailable && (
        <p className="mt-1 text-xs text-stone-500">
          Address suggestions aren&apos;t available right now. Type the full address.
        </p>
      )}
    </div>
  );
}
