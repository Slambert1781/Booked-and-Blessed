"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Phone-only top bar with a button that slides the profile panel in from the left.
export function MobileDrawer({ avatar, children }: { avatar: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  return (
    <div className="lg:hidden">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-stone-200 bg-stone-50/95 px-4 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))] backdrop-blur">
        <button
          type="button"
          aria-label="Open profile and menu"
          onClick={() => setOpen(true)}
          className="rounded-full"
        >
          {avatar}
        </button>
        <span className="font-semibold">Booked and Blessed</span>
      </header>

      <div
        className={`fixed inset-0 z-30 bg-black/40 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-[85%] max-w-xs overflow-y-auto bg-stone-50 px-4 pb-6 pt-[max(1rem,env(safe-area-inset-top))] shadow-xl transition-transform ${open ? "translate-x-0" : "-translate-x-full"}`}
        aria-hidden={!open}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mb-3 ml-auto block rounded-lg px-3 py-1 text-2xl text-stone-500"
          aria-label="Close"
        >
          ×
        </button>
        {children}
      </aside>
    </div>
  );
}
