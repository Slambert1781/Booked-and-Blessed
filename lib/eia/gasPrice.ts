import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { seriesForState, type GasSeries } from "./stateSeries";

export type GasPrice = {
  price: number;
  areaName: string;
  kind: GasSeries["kind"];
  periodDate: string; // YYYY-MM-DD, the week EIA published
};

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Latest weekly price for a series, or the latest on or before `onOrBefore` (YYYY-MM-DD). */
async function fetchFromEia(
  seriesId: string,
  onOrBefore?: string,
): Promise<{ price: number; periodDate: string } | null> {
  const key = process.env.EIA_API_KEY;
  if (!key) throw new Error("EIA_API_KEY is not set");
  const q = new URLSearchParams({
    api_key: key,
    frequency: "weekly",
    "data[0]": "value",
    "facets[series][]": seriesId,
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
    length: "1",
    ...(onOrBefore && { end: onOrBefore }),
  });
  const res = await fetch(`https://api.eia.gov/v2/petroleum/pri/gnd/data/?${q}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`EIA ${res.status}`);
  const body = (await res.json()) as { response?: { data?: { period: string; value: unknown }[] } };
  const row = body.response?.data?.[0];
  const price = Number(row?.value);
  if (!row || !Number.isFinite(price) || price <= 0) return null;
  return { price, periodDate: row.period };
}

/**
 * Latest gas price for a state, falling back to region then national.
 * Cached in Supabase and refreshed from EIA at most once a day.
 */
export async function getGasPrice(state: string | null): Promise<GasPrice> {
  const supabase = await createClient();
  const candidates = seriesForState(state);

  const { data: cached } = await supabase
    .from("gas_price_cache")
    .select("series_id, price, period_date, fetched_at")
    .in(
      "series_id",
      candidates.map((c) => c.seriesId),
    );
  const cache = new Map((cached ?? []).map((r) => [r.series_id as string, r]));

  for (const s of candidates) {
    const hit = cache.get(s.seriesId);
    const fresh = hit && Date.now() - new Date(hit.fetched_at).getTime() < ONE_DAY_MS;
    if (fresh) return { price: Number(hit.price), areaName: s.areaName, kind: s.kind, periodDate: hit.period_date };

    let latest: { price: number; periodDate: string } | null = null;
    try {
      latest = await fetchFromEia(s.seriesId);
    } catch {
      // EIA down: use a stale cached price if we have one.
      if (hit) return { price: Number(hit.price), areaName: s.areaName, kind: s.kind, periodDate: hit.period_date };
      throw new Error("Couldn't reach the EIA for gas prices.");
    }
    if (!latest) continue; // no data for this series; try the next one

    try {
      await createAdminClient().from("gas_price_cache").upsert({
        series_id: s.seriesId,
        area_name: s.areaName,
        price: latest.price,
        period_date: latest.periodDate,
        fetched_at: new Date().toISOString(),
      });
    } catch {
      // Caching is best-effort.
    }
    return { price: latest.price, areaName: s.areaName, kind: s.kind, periodDate: latest.periodDate };
  }
  throw new Error("No gas price available.");
}

/**
 * The weekly average for the week of a past date, for gigs entered after
 * they happened. Not cached: each past week is looked up once per gig.
 */
export async function getGasPriceForDate(state: string | null, date: string): Promise<GasPrice> {
  for (const s of seriesForState(state)) {
    const found = await fetchFromEia(s.seriesId, date);
    if (found) return { price: found.price, areaName: s.areaName, kind: s.kind, periodDate: found.periodDate };
  }
  throw new Error("No gas price available for that date.");
}
