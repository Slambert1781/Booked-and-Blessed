"use client";

import { useCelebration } from "./CelebrationProvider";

// On/off for this device, and a preview that shows even when it's off.
export function CelebrationSettings() {
  const { enabled, setEnabled, celebrate } = useCelebration();
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Celebrations</h2>
      <label className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
        <span>
          <span className="block">Celebrate when I book a gig</span>
          <span className="block text-xs text-stone-500">On this device only</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          className="h-6 w-6 shrink-0 accent-indigo-700"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
      </label>
      <button type="button" className="btn-secondary w-full py-2 text-sm" onClick={() => celebrate("Gig booked!", { preview: true })}>
        Preview the badge
      </button>
    </section>
  );
}
