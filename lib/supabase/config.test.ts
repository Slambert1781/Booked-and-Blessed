import { afterEach, describe, expect, it, vi } from "vitest";

async function load(url: string) {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  return (await import("./config")).SUPABASE_URL;
}

describe("SUPABASE_URL", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("keeps a clean project URL as is", async () => {
    expect(await load("https://abc.supabase.co")).toBe("https://abc.supabase.co");
  });

  it("drops a /rest/v1/ path, trailing slash, spaces and quotes", async () => {
    expect(await load(" https://abc.supabase.co/rest/v1/ ")).toBe("https://abc.supabase.co");
    expect(await load('"https://abc.supabase.co/"')).toBe("https://abc.supabase.co");
  });
});
