import { describe, expect, it } from "vitest";
import { addMonths, monthGrid, parseMonth } from "./calendar";

describe("monthGrid", () => {
  it("starts on the right weekday and covers every day", () => {
    // November 2026 starts on a Sunday and has 30 days.
    const weeks = monthGrid({ year: 2026, month: 11 });
    expect(weeks[0][0]).toBe("2026-11-01");
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("pads the first week before day 1", () => {
    // October 2026 starts on a Thursday.
    const weeks = monthGrid({ year: 2026, month: 10 });
    expect(weeks[0].slice(0, 4)).toEqual([null, null, null, null]);
    expect(weeks[0][4]).toBe("2026-10-01");
  });

  it("handles leap years", () => {
    expect(monthGrid({ year: 2028, month: 2 }).flat().filter(Boolean)).toHaveLength(29);
  });
});

describe("addMonths / parseMonth", () => {
  it("crosses year boundaries", () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2027, month: 1 }, -1)).toEqual({ year: 2026, month: 12 });
  });

  it("falls back on bad input", () => {
    const fb = { year: 2026, month: 10 };
    expect(parseMonth("2026-13", fb)).toBe(fb);
    expect(parseMonth("nope", fb)).toBe(fb);
    expect(parseMonth("2027-03", fb)).toEqual({ year: 2027, month: 3 });
  });
});
