import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("withState", () => {
  it("adds the state to an address that lacks it", async () => {
    const { withState } = await import("./places");
    expect(withState("1810 15th Ave SW", "OR")).toBe("1810 15th Ave SW, OR");
  });

  it("leaves an address that already has the state", async () => {
    const { withState } = await import("./places");
    expect(withState("24241 Cardwell Hill Dr, Philomath, OR 97370, USA", "OR")).toBe(
      "24241 Cardwell Hill Dr, Philomath, OR 97370, USA",
    );
  });

  it("does nothing without a state", async () => {
    const { withState } = await import("./places");
    expect(withState("1810 15th Ave SW", null)).toBe("1810 15th Ave SW");
  });

  it("doesn't mistake letters inside a word for the state", async () => {
    const { withState } = await import("./places");
    expect(withState("12 Orchard Way", "OR")).toBe("12 Orchard Way, OR");
  });
});
