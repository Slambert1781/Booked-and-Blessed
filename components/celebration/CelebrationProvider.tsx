"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
  CELEBRATIONS_STORAGE_KEY,
  celebrationTiming,
  readEnabled,
  shouldCelebrate,
  writeEnabled,
  type ChangeSource,
} from "@/lib/celebrate";
import { CelebrationBadge } from "./CelebrationBadge";

type Celebration = {
  /** Show a badge with this message, if celebrations are on (or `preview`). */
  celebrate: (message: string, opts?: { preview?: boolean }) => void;
  /** Celebrate a status change when the rules say so (e.g. a gig newly booked). */
  celebrateChange: (
    message: string,
    change: { previousStatus: string | null; nextStatus: string; source?: ChangeSource },
  ) => void;
  /** The on/off setting for this device. */
  enabled: boolean;
  setEnabled: (on: boolean) => void;
};

const CelebrationContext = createContext<Celebration | null>(null);

/** In Booked and Blessed, booking a gig ("taken") is the win. */
const WINNING_STATUS = "taken";

function readStoredEnabled(): boolean {
  try {
    return readEnabled(window.localStorage.getItem(CELEBRATIONS_STORAGE_KEY));
  } catch {
    return true; // storage unavailable (private mode, blocked): default on
  }
}

// Holds the setting and shows the centred badge pop-up.
export function CelebrationProvider({ children }: { children: React.ReactNode }) {
  const [enabled, setEnabledState] = useState(true);
  const [shown, setShown] = useState<{ id: number; message: string } | null>(null);
  const [fading, setFading] = useState(false);
  const [fadeMs, setFadeMs] = useState(0);
  const timers = useRef<number[]>([]);
  const nextId = useRef(0);

  useEffect(() => setEnabledState(readStoredEnabled()), []);

  const clearTimers = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const dismiss = useCallback(() => {
    clearTimers();
    setShown(null);
    setFading(false);
  }, []);

  const show = useCallback((message: string) => {
    clearTimers();
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    const t = celebrationTiming(reduced);
    setFadeMs(t.fadeMs);
    setFading(false);
    setShown({ id: ++nextId.current, message });
    timers.current.push(
      window.setTimeout(() => setFading(true), t.fadeAtMs),
      window.setTimeout(() => {
        setShown(null);
        setFading(false);
      }, t.doneAtMs),
    );
  }, []);

  const celebrate = useCallback<Celebration["celebrate"]>(
    (message, opts) => {
      if (opts?.preview || readStoredEnabled()) show(message);
    },
    [show],
  );

  const celebrateChange = useCallback<Celebration["celebrateChange"]>(
    (message, change) => {
      const go = shouldCelebrate({
        previousStatus: change.previousStatus,
        nextStatus: change.nextStatus,
        winningStatus: WINNING_STATUS,
        source: change.source ?? "local",
        enabled: readStoredEnabled(),
      });
      if (go) show(message);
    },
    [show],
  );

  const setEnabled = useCallback((on: boolean) => {
    setEnabledState(on);
    try {
      window.localStorage.setItem(CELEBRATIONS_STORAGE_KEY, writeEnabled(on));
    } catch {
      // Storage unavailable: the switch still works until the page reloads.
    }
  }, []);

  return (
    <CelebrationContext.Provider value={{ celebrate, celebrateChange, enabled, setEnabled }}>
      {children}
      {/* Always present, so screen readers announce the message when it appears. */}
      <div role="status" aria-live="polite" className={shown ? "" : "sr-only"}>
        {shown && (
          <div
            key={shown.id}
            onClick={dismiss}
            className="fixed inset-0 z-[70] flex cursor-pointer items-center justify-center bg-stone-900/25 px-6 backdrop-blur-[2px] dark:bg-black/55"
            style={{ opacity: fading ? 0 : 1, transition: `opacity ${fadeMs}ms ease-out` }}
          >
            <div className="celebration-card flex flex-col items-center gap-3 rounded-[2rem] bg-white/95 px-10 pb-7 pt-8 shadow-2xl ring-1 ring-black/5 dark:bg-stone-900/95 dark:ring-white/10">
              <CelebrationBadge />
              <p className="font-sans text-2xl font-semibold tracking-tight text-stone-900 dark:text-white">
                {shown.message}
              </p>
              <p className="text-xs text-stone-400 dark:text-stone-500">Tap anywhere to close</p>
            </div>
          </div>
        )}
      </div>
    </CelebrationContext.Provider>
  );
}

export function useCelebration(): Celebration {
  const c = useContext(CelebrationContext);
  if (!c) throw new Error("useCelebration must be used inside <CelebrationProvider>");
  return c;
}

/** Celebrates once when shown, e.g. on the page you land on after booking a gig. */
export function CelebrateOnMount({ message }: { message: string }) {
  const { celebrateChange } = useCelebration();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    // The server only renders this when a gig has just been booked on this device.
    celebrateChange(message, { previousStatus: null, nextStatus: WINNING_STATUS, source: "local" });
  }, [celebrateChange, message]);
  return null;
}
