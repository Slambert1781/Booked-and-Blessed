import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

// Fake fueleconomy.gov: two versions of a model at 22 and 27 MPG, one with no data.
function fakeFetch(options: unknown, mpgById: Record<string, unknown>) {
  return vi.fn(async (url: string) => {
    const body = url.includes("/menu/options")
      ? options
      : { comb08: mpgById[url.split("/vehicle/")[1]] };
    return new Response(JSON.stringify(body), { status: 200 });
  });
}

describe("getModelMpg", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("averages combined MPG across versions and reports the range", async () => {
    vi.stubGlobal(
      "fetch",
      fakeFetch(
        { menuItem: [{ text: "Auto 6-spd", value: "1" }, { text: "AWD", value: "2" }, { text: "Hybrid", value: "3" }] },
        { "1": "22", "2": "27", "3": null },
      ),
    );
    const { getModelMpg } = await import("./fueleconomy");
    expect(await getModelMpg("2019", "Honda", "Odyssey")).toEqual({ mpg: 25, versions: 2, low: 22, high: 27 });
  });

  it("handles a model with a single version (menuItem is an object, not a list)", async () => {
    vi.stubGlobal("fetch", fakeFetch({ menuItem: { text: "Auto", value: "9" } }, { "9": "31" }));
    const { getModelMpg } = await import("./fueleconomy");
    expect(await getModelMpg("2020", "Toyota", "Prius")).toEqual({ mpg: 31, versions: 1, low: 31, high: 31 });
  });

  it("returns null when no version has an MPG", async () => {
    vi.stubGlobal("fetch", fakeFetch({ menuItem: [] }, {}));
    const { getModelMpg } = await import("./fueleconomy");
    expect(await getModelMpg("1990", "X", "Y")).toBeNull();
  });
});
