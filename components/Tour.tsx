"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// First-time walkthrough on the gig list: dims the screen, highlights one
// item at a time and explains it in a small box. Items are found by their
// data-tour attribute; the first one that's actually on screen is used, so
// the same step can point at the sidebar on a computer or the menu button on
// a phone. Steps with no target show a centred box.

type Step = {
  targets: string[];
  title: string;
  body: (target: string | null) => React.ReactNode;
};

const STEPS: Step[] = [
  {
    targets: [],
    title: "Welcome!",
    body: () =>
      "Booked and Blessed shows what a gig really pays once gas, drive time, food and hotels are taken out. Here's a quick tour. It takes 30 seconds.",
  },
  {
    targets: ["new-gig"],
    title: "Got offered a gig?",
    body: () =>
      "Tap New gig. Enter the fee, the venue and each rehearsal and performance. The app works out the miles, drive time, gas and food, then shows your real take-home and real hourly rate. Already played it? Turn on Already played to log what it actually paid and cost.",
  },
  {
    targets: ["gigs"],
    title: "Every gig you check is saved here",
    body: () =>
      "Each gig gets a colour: green is worth it, yellow is a close call, red isn't. Open one to see why, then Book it or Decline it. You can edit a gig or copy it for next season, and the tabs sort them into Undecided, Booked and Declined.",
  },
  {
    targets: ["calendar", "menu"],
    title: "Your calendar",
    body: (t) =>
      t === "menu"
        ? "Tap your picture to open the menu. That's where your Calendar is: every rehearsal and concert for gigs you've booked, with what you'll earn each month."
        : "Every rehearsal and concert for gigs you've booked, with what you'll take home each month.",
  },
  {
    targets: ["clients", "menu"],
    title: "Clients and relationship tiers",
    body: (t) => (
      <>
        Not every gig is only about the money. Give each orchestra, church or contractor a tier, from{" "}
        <strong>New Face</strong> to <strong>Highly Favored</strong>; closer relationships lower your minimum hourly
        rate for their gigs.
        <br />
        <br />
        <strong>Example:</strong> a <strong>$300</strong> concert set works out to <strong>$26 an hour</strong> after
        gas and driving. Against a $40 minimum that&apos;s <strong className="text-red-700">red</strong> for a
        stranger, but <strong className="text-emerald-700">green</strong> for your Highly Favored orchestra, whose
        minimum is $24.
        {t === "menu" && (
          <>
            <br />
            <br />
            Find <strong>Clients</strong> in the menu.
          </>
        )}
      </>
    ),
  },
  {
    targets: ["profile", "menu"],
    title: "Your profile",
    body: (t) =>
      `Your home, car, hourly rates, minimum rate, taxes and meal prices live ${t === "menu" ? "in the menu too" : "here"}. Change them any time. Gigs you've already saved keep the numbers they were worked out with.`,
  },
  {
    targets: [],
    title: "You're all set",
    body: () => (
      <>
        Tip: add the app to your home screen so it opens like an app. On iPhone, use Safari&apos;s{" "}
        <strong>Share → Add to Home Screen</strong>. On Android, use Chrome&apos;s <strong>⋮ → Add to Home screen</strong>.
        <br />
        <br />
        For the full guide to every feature, open <strong>How it works</strong> in the menu.
      </>
    ),
  },
];

const PAD = 6;
const GAP = 12;
const MARGIN = 16;

function findTarget(names: string[]): { name: string; el: HTMLElement } | null {
  for (const name of names) {
    for (const el of document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`)) {
      const r = el.getBoundingClientRect();
      const visible =
        r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth && getComputedStyle(el).visibility !== "hidden";
      if (visible) return { name, el };
    }
  }
  return null;
}

export function Tour({ start, hasGigs, replay }: { start: boolean; hasGigs: boolean; replay: boolean }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<{ name: string; rect: DOMRect } | null>(null);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);
  const bubble = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (start) {
      setIndex(0);
      setOpen(true);
    }
  }, [start]);

  const step = STEPS[index];

  // Find and measure the highlighted item; keep it in place on scroll/resize.
  const measure = useCallback(() => {
    const found = findTarget(step.targets);
    setTarget(found ? { name: found.name, rect: found.el.getBoundingClientRect() } : null);
  }, [step]);

  useEffect(() => {
    if (!open) return;
    const found = findTarget(step.targets);
    if (found) {
      const r = found.el.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) found.el.scrollIntoView({ block: "center" });
    }
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step, measure]);

  // Place the box below the item if it fits, otherwise above; centred if no item.
  useLayoutEffect(() => {
    if (!open || !bubble.current) return;
    const b = bubble.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (!target) {
      setBox({ top: Math.max(MARGIN, (vh - b.height) / 2), left: (vw - b.width) / 2 });
      return;
    }
    const r = target.rect;
    const below = r.bottom + PAD + GAP;
    const above = r.top - PAD - GAP - b.height;
    const top =
      below + b.height <= vh - MARGIN ? below : above >= MARGIN ? above : Math.max(MARGIN, vh - MARGIN - b.height);
    const left = Math.min(Math.max(MARGIN, r.left + r.width / 2 - b.width / 2), vw - MARGIN - b.width);
    setBox({ top, left });
  }, [open, target, index]);

  const finish = useCallback(
    (then?: string) => {
      setOpen(false);
      createClient()
        .auth.updateUser({ data: { tour_done: true } })
        .catch(() => {});
      if (then) router.push(then);
      else if (replay) router.replace("/");
    },
    [router, replay],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      if (e.key === "ArrowRight" && index < STEPS.length - 1) setIndex(index + 1);
      if (e.key === "ArrowLeft" && index > 0) setIndex(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, index, finish]);

  if (!open) return null;
  const last = index === STEPS.length - 1;
  const r = target?.rect;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Dimmed screen with a cut-out around the highlighted item */}
      {r ? (
        <div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-white transition-all duration-200"
          style={{
            top: r.top - PAD,
            left: r.left - PAD,
            width: r.width + PAD * 2,
            height: r.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(28, 25, 23, 0.6)",
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-stone-900/60" />
      )}

      <div
        ref={bubble}
        className="fixed w-[min(22rem,calc(100vw-2rem))] rounded-2xl bg-white p-5 shadow-2xl transition-[top,left] duration-200"
        style={box ? { top: box.top, left: box.left } : { visibility: "hidden", top: 0, left: 0 }}
      >
        <p className="text-xs font-medium text-indigo-700">
          {index + 1} of {STEPS.length}
        </p>
        <h2 id="tour-title" className="mt-1 text-lg font-semibold">
          {step.title}
        </h2>
        <div className="mt-2 text-[15px] leading-relaxed text-stone-700">{step.body(target?.name ?? null)}</div>

        <div className="mt-5 flex items-center gap-2">
          {!last && (
            <button type="button" className="mr-auto text-sm text-stone-500" onClick={() => finish()}>
              Skip tour
            </button>
          )}
          {index > 0 && (
            <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => setIndex(index - 1)}>
              Back
            </button>
          )}
          {last ? (
            hasGigs ? (
              <button type="button" className="btn-primary ml-auto px-5 py-2 text-sm" onClick={() => finish()}>
                Done
              </button>
            ) : (
              <>
                <button type="button" className="ml-auto text-sm text-stone-500" onClick={() => finish()}>
                  Later
                </button>
                <button type="button" className="btn-primary px-4 py-2 text-sm" onClick={() => finish("/gigs/new")}>
                  Add my first gig
                </button>
              </>
            )
          ) : (
            <button
              type="button"
              className={`btn-primary px-5 py-2 text-sm ${index === 0 ? "ml-auto" : ""}`}
              onClick={() => setIndex(index + 1)}
            >
              {index === 0 ? "Show me" : "Next"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
