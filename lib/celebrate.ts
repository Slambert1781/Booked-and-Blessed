// When to pop the celebration badge, and for how long. Pure: no app imports,
// no browser APIs, so it's easy to test and to reuse.

/** Where a change came from: this device, or another device or user (live sync). */
export type ChangeSource = "local" | "remote";

export type CelebrateInput = {
  /** The status before and after the change, e.g. "undecided" -> "taken". */
  previousStatus: string | null;
  nextStatus: string;
  /** The status that counts as a win (in Booked and Blessed: "taken", i.e. booked). */
  winningStatus: string;
  source: ChangeSource;
  /** The on/off setting for this device. */
  enabled: boolean;
};

/**
 * Celebrate when something newly reaches the winning status on this device
 * and celebrations are switched on. Never for changes that arrive from
 * elsewhere, and not when it was already in that status.
 */
export function shouldCelebrate(i: CelebrateInput): boolean {
  if (!i.enabled) return false;
  if (i.source === "remote") return false;
  return i.nextStatus === i.winningStatus && i.previousStatus !== i.winningStatus;
}

/**
 * Did a goal just reach 100%? True only on the change that crosses the line,
 * not when it was already complete. Percentages can be null (unknown).
 */
export function newlyReachedFull(previousPct: number | null | undefined, nextPct: number | null | undefined): boolean {
  if (nextPct === null || nextPct === undefined || !Number.isFinite(nextPct)) return false;
  const before = previousPct === null || previousPct === undefined || !Number.isFinite(previousPct) ? 0 : previousPct;
  return before < 100 && nextPct >= 100;
}

/** How long the badge stays up. */
export const CELEBRATION_TOTAL_MS = 4200;
export const CELEBRATION_FADE_MS = 300;
export const CELEBRATION_REDUCED_MOTION_MS = 2500;

/**
 * Timing for one badge: when the fade starts and when it's gone. With
 * reduced motion there's no fade or movement: the badge is simply shown,
 * still, for 2.5 s.
 */
export function celebrationTiming(reducedMotion: boolean): { fadeAtMs: number; doneAtMs: number; fadeMs: number } {
  if (reducedMotion) return { fadeAtMs: CELEBRATION_REDUCED_MOTION_MS, doneAtMs: CELEBRATION_REDUCED_MOTION_MS, fadeMs: 0 };
  return {
    fadeAtMs: CELEBRATION_TOTAL_MS - CELEBRATION_FADE_MS,
    doneAtMs: CELEBRATION_TOTAL_MS,
    fadeMs: CELEBRATION_FADE_MS,
  };
}

/** The setting as stored for this device: on unless explicitly "off". */
export const CELEBRATIONS_STORAGE_KEY = "celebrations";
export const readEnabled = (stored: string | null | undefined) => stored !== "off";
export const writeEnabled = (enabled: boolean) => (enabled ? "on" : "off");
