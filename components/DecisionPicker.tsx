"use client";

import type { GigStatus } from "@/lib/gigs";

const OPTIONS: { value: GigStatus; label: string; on: string }[] = [
  { value: "taken", label: "Book it", on: "bg-emerald-600 text-white border-emerald-600" },
  { value: "declined", label: "Decline", on: "bg-stone-700 text-white border-stone-700" },
  { value: "undecided", label: "Undecided", on: "bg-amber-400 text-amber-950 border-amber-400" },
];

/**
 * Book it / Decline / Undecided. With `allowNone`, tapping the selected
 * button again clears the choice.
 */
export function DecisionPicker({
  value,
  onChange,
  allowNone = false,
  disabled = false,
}: {
  value: GigStatus | null;
  onChange: (next: GigStatus | null) => void;
  allowNone?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2" aria-busy={disabled}>
      {OPTIONS.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => {
              if (selected) {
                if (allowNone) onChange(null);
              } else onChange(o.value);
            }}
            className={`rounded-lg border px-2 py-3 font-semibold ${selected ? o.on : "border-stone-300 bg-white text-stone-800 active:bg-stone-100"}`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
