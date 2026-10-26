"use client";

import type { RushPeriod } from "@/lib/relationships";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

function MonthDay({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [m, d] = value.split("-").map(Number);
  return (
    <div className="min-w-0">
      <span className="block text-xs text-stone-500">{label}</span>
      <div className="mt-1 flex gap-1">
        <select className="field px-2" value={m} onChange={(e) => onChange(`${pad(Number(e.target.value))}-${pad(d)}`)} aria-label={`${label} month`}>
          {MONTHS.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <select className="field w-16 px-2" value={d} onChange={(e) => onChange(`${pad(m)}-${pad(Number(e.target.value))}`)} aria-label={`${label} day`}>
          {Array.from({ length: 31 }, (_, i) => (
            <option key={i} value={i + 1}>
              {i + 1}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Yearly date ranges that count as Holiday Rush.
export function RushPeriodsEditor({ value, onChange }: { value: RushPeriod[]; onChange: (v: RushPeriod[]) => void }) {
  const update = (i: number, patch: Partial<RushPeriod>) => onChange(value.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <div className="space-y-3">
      {value.map((p, i) => (
        <div key={i} className="space-y-2 rounded-xl bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <input
              className="field py-2"
              value={p.label}
              onChange={(e) => update(i, { label: e.target.value })}
              placeholder="e.g. Christmas"
              aria-label="Rush period name"
            />
            <button
              type="button"
              className="h-10 w-10 shrink-0 rounded-lg text-xl text-stone-500 active:bg-stone-200"
              aria-label="Remove rush period"
              onClick={() => onChange(value.filter((_, j) => j !== i))}
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MonthDay label="From" value={p.start} onChange={(start) => update(i, { start })} />
            <MonthDay label="To" value={p.end} onChange={(end) => update(i, { end })} />
          </div>
        </div>
      ))}
      <button
        type="button"
        className="btn-secondary w-full py-2 text-sm"
        onClick={() => onChange([...value, { label: "", start: "06-01", end: "06-30" }])}
      >
        + Add a rush period
      </button>
    </div>
  );
}
