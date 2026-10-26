"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// "Saved" confirmation shown on the gig list after adding a gig. Fades after
// a few seconds and tidies ?saved= out of the address.
export function SavedBanner({ gigId, text }: { gigId: string; text: string }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    // Plain history update: tidies the address without reloading the page
    // (a router navigation would re-render the list without this banner).
    window.history.replaceState(window.history.state, "", "/");
    const t = setTimeout(() => setVisible(false), 6000);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;
  return (
    <div role="status" className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-600 px-4 py-3 text-white shadow-sm">
      <span aria-hidden className="text-lg">✓</span>
      <Link href={`/gigs/${gigId}`} className="min-w-0 flex-1 truncate text-sm font-medium">
        {text}
      </Link>
      <button type="button" aria-label="Dismiss" className="text-lg text-emerald-100" onClick={() => setVisible(false)}>
        ×
      </button>
    </div>
  );
}
