import { describe, expect, it } from "vitest";
import {
  celebrationTiming,
  newlyReachedFull,
  readEnabled,
  shouldCelebrate,
  writeEnabled,
  type CelebrateInput,
} from "./celebrate";

const booking: CelebrateInput = {
  previousStatus: "undecided",
  nextStatus: "taken",
  winningStatus: "taken",
  source: "local",
  enabled: true,
};

describe("shouldCelebrate", () => {
  it("celebrates choosing to book on this device", () => {
    expect(shouldCelebrate(booking)).toBe(true);
    expect(shouldCelebrate({ ...booking, previousStatus: "declined" })).toBe(true);
    expect(shouldCelebrate({ ...booking, previousStatus: null })).toBe(true); // a new gig saved as booked
  });

  it("not when it was already booked", () => {
    expect(shouldCelebrate({ ...booking, previousStatus: "taken" })).toBe(false);
  });

  it("not for other decisions", () => {
    expect(shouldCelebrate({ ...booking, nextStatus: "declined" })).toBe(false);
    expect(shouldCelebrate({ ...booking, previousStatus: "taken", nextStatus: "undecided" })).toBe(false);
  });

  it("not when the change came from another device or user", () => {
    expect(shouldCelebrate({ ...booking, source: "remote" })).toBe(false);
  });

  it("not when switched off on this device", () => {
    expect(shouldCelebrate({ ...booking, enabled: false })).toBe(false);
  });
});

describe("newlyReachedFull", () => {
  it("true only on the change that reaches 100%", () => {
    expect(newlyReachedFull(80, 100)).toBe(true);
    expect(newlyReachedFull(99.9, 100)).toBe(true);
    expect(newlyReachedFull(90, 120)).toBe(true); // overshooting still counts
  });

  it("false when already complete or not there yet", () => {
    expect(newlyReachedFull(100, 100)).toBe(false);
    expect(newlyReachedFull(100, 110)).toBe(false);
    expect(newlyReachedFull(50, 99)).toBe(false);
    expect(newlyReachedFull(100, 80)).toBe(false);
  });

  it("treats an unknown starting point as 0 and an unknown result as not done", () => {
    expect(newlyReachedFull(null, 100)).toBe(true);
    expect(newlyReachedFull(undefined, 100)).toBe(true);
    expect(newlyReachedFull(50, null)).toBe(false);
    expect(newlyReachedFull(50, Number.NaN)).toBe(false);
  });
});

describe("celebrationTiming", () => {
  it("about 4.2 s in total, fading out over the last 300 ms", () => {
    expect(celebrationTiming(false)).toEqual({ fadeAtMs: 3900, doneAtMs: 4200, fadeMs: 300 });
  });

  it("reduced motion: shown still for 2.5 s, no fade", () => {
    expect(celebrationTiming(true)).toEqual({ fadeAtMs: 2500, doneAtMs: 2500, fadeMs: 0 });
  });
});

describe("the on/off setting", () => {
  it("is on unless stored as off", () => {
    expect(readEnabled(null)).toBe(true);
    expect(readEnabled(undefined)).toBe(true);
    expect(readEnabled("on")).toBe(true);
    expect(readEnabled("garbage")).toBe(true);
    expect(readEnabled("off")).toBe(false);
    expect(readEnabled(writeEnabled(false))).toBe(false);
    expect(readEnabled(writeEnabled(true))).toBe(true);
  });
});
