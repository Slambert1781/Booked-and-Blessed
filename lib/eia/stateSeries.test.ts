import { describe, expect, it } from "vitest";
import { US_STATES } from "@/lib/states";
import { seriesForState } from "./stateSeries";

describe("seriesForState", () => {
  it("uses the state series first for states that have one", () => {
    const s = seriesForState("TX");
    expect(s.map((x) => x.seriesId)).toEqual([
      "EMM_EPMR_PTE_STX_DPG",
      "EMM_EPMR_PTE_R30_DPG",
      "EMM_EPMR_PTE_NUS_DPG",
    ]);
    expect(s[0].kind).toBe("state");
  });

  it("falls back to the regional average for other states", () => {
    const s = seriesForState("OK");
    expect(s[0]).toMatchObject({ seriesId: "EMM_EPMR_PTE_R20_DPG", kind: "region" });
  });

  it("maps every state and DC to a region before the national average", () => {
    for (const { code } of US_STATES) {
      const s = seriesForState(code);
      expect(s.length, code).toBeGreaterThanOrEqual(2);
      expect(s.at(-1)?.kind).toBe("national");
    }
  });

  it("falls back to the national average for an unknown state", () => {
    expect(seriesForState(null).map((x) => x.kind)).toEqual(["national"]);
  });
});
