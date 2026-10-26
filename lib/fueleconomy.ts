import "server-only";

// fueleconomy.gov web services (free, no key).
// Menu endpoints return { menuItem: [...] }, or { menuItem: {...} } when there
// is only one item, so normalise to an array.
const BASE = "https://www.fueleconomy.gov/ws/rest";

export type MenuItem = { text: string; value: string };

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) throw new Error(`fueleconomy.gov ${res.status}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function toMenu(data: unknown): MenuItem[] {
  const raw = (data as { menuItem?: unknown } | null)?.menuItem;
  const items = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return items
    .filter((i): i is { text: unknown; value: unknown } => !!i && typeof i === "object")
    .map((i) => ({ text: String(i.text), value: String(i.value) }));
}

export async function getYears() {
  return toMenu(await getJson("/vehicle/menu/year"));
}

export async function getMakes(year: string) {
  return toMenu(await getJson(`/vehicle/menu/make?year=${encodeURIComponent(year)}`));
}

export async function getModels(year: string, make: string) {
  const q = new URLSearchParams({ year, make });
  return toMenu(await getJson(`/vehicle/menu/model?${q}`));
}

/** Trim/options; each item's value is the vehicle id. */
export async function getOptions(year: string, make: string, model: string) {
  const q = new URLSearchParams({ year, make, model });
  return toMenu(await getJson(`/vehicle/menu/options?${q}`));
}

/** Combined MPG for a vehicle id (comb08). Null if unavailable. */
export async function getCombinedMpg(id: string): Promise<number | null> {
  const data = (await getJson(`/vehicle/${encodeURIComponent(id)}`)) as {
    comb08?: unknown;
  } | null;
  const mpg = Number(data?.comb08);
  return Number.isFinite(mpg) && mpg > 0 ? mpg : null;
}

export type ModelMpg = { mpg: number; versions: number; low: number; high: number };

/**
 * Combined MPG for a year/make/model without choosing a trim: the average
 * across all its versions (engines, drivetrains), with the range.
 */
export async function getModelMpg(year: string, make: string, model: string): Promise<ModelMpg | null> {
  const options = await getOptions(year, make, model);
  const mpgs = (await Promise.all(options.map((o) => getCombinedMpg(o.value).catch(() => null)))).filter(
    (m): m is number => m !== null,
  );
  if (mpgs.length === 0) return null;
  return {
    mpg: Math.round(mpgs.reduce((a, b) => a + b, 0) / mpgs.length),
    versions: mpgs.length,
    low: Math.min(...mpgs),
    high: Math.max(...mpgs),
  };
}
