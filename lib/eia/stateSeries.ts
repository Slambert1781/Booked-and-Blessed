// EIA weekly retail regular gasoline price series (all formulations, $/gal).
// Series ids follow EMM_EPMR_PTE_<area>_DPG.
//
// A handful of states have their own series. Everyone else uses their
// regional average: PADD 1 is split into its three sub-regions, and West
// Coast states other than California use "West Coast less California",
// since California prices would skew the average.

export type GasSeries = { seriesId: string; areaName: string; kind: "state" | "region" | "national" };

const series = (area: string, areaName: string, kind: GasSeries["kind"]): GasSeries => ({
  seriesId: `EMM_EPMR_PTE_${area}_DPG`,
  areaName,
  kind,
});

export const NATIONAL = series("NUS", "U.S. average", "national");

const STATE_SERIES: Record<string, GasSeries> = {
  CA: series("SCA", "California", "state"),
  CO: series("SCO", "Colorado", "state"),
  FL: series("SFL", "Florida", "state"),
  MA: series("SMA", "Massachusetts", "state"),
  MN: series("SMN", "Minnesota", "state"),
  NY: series("SNY", "New York", "state"),
  OH: series("SOH", "Ohio", "state"),
  TX: series("STX", "Texas", "state"),
  WA: series("SWA", "Washington", "state"),
};

const NEW_ENGLAND = series("R1X", "New England (PADD 1A)", "region");
const CENTRAL_ATLANTIC = series("R1Y", "Central Atlantic (PADD 1B)", "region");
const LOWER_ATLANTIC = series("R1Z", "Lower Atlantic (PADD 1C)", "region");
const MIDWEST = series("R20", "Midwest (PADD 2)", "region");
const GULF_COAST = series("R30", "Gulf Coast (PADD 3)", "region");
const ROCKY_MOUNTAIN = series("R40", "Rocky Mountain (PADD 4)", "region");
const WEST_COAST = series("R50", "West Coast (PADD 5)", "region");
const WEST_COAST_LESS_CA = series("R5XCA", "West Coast except California (PADD 5)", "region");

const REGION_BY_STATE: Record<string, GasSeries> = {
  CT: NEW_ENGLAND, ME: NEW_ENGLAND, MA: NEW_ENGLAND, NH: NEW_ENGLAND, RI: NEW_ENGLAND, VT: NEW_ENGLAND,
  DE: CENTRAL_ATLANTIC, DC: CENTRAL_ATLANTIC, MD: CENTRAL_ATLANTIC, NJ: CENTRAL_ATLANTIC,
  NY: CENTRAL_ATLANTIC, PA: CENTRAL_ATLANTIC,
  FL: LOWER_ATLANTIC, GA: LOWER_ATLANTIC, NC: LOWER_ATLANTIC, SC: LOWER_ATLANTIC,
  VA: LOWER_ATLANTIC, WV: LOWER_ATLANTIC,
  IL: MIDWEST, IN: MIDWEST, IA: MIDWEST, KS: MIDWEST, KY: MIDWEST, MI: MIDWEST, MN: MIDWEST,
  MO: MIDWEST, NE: MIDWEST, ND: MIDWEST, SD: MIDWEST, OH: MIDWEST, OK: MIDWEST, TN: MIDWEST,
  WI: MIDWEST,
  AL: GULF_COAST, AR: GULF_COAST, LA: GULF_COAST, MS: GULF_COAST, NM: GULF_COAST, TX: GULF_COAST,
  CO: ROCKY_MOUNTAIN, ID: ROCKY_MOUNTAIN, MT: ROCKY_MOUNTAIN, UT: ROCKY_MOUNTAIN, WY: ROCKY_MOUNTAIN,
  CA: WEST_COAST,
  AK: WEST_COAST_LESS_CA, AZ: WEST_COAST_LESS_CA, HI: WEST_COAST_LESS_CA, NV: WEST_COAST_LESS_CA,
  OR: WEST_COAST_LESS_CA, WA: WEST_COAST_LESS_CA,
};

/** Series to try for a state, most specific first. */
export function seriesForState(state: string | null | undefined): GasSeries[] {
  const code = (state ?? "").toUpperCase();
  return [STATE_SERIES[code], REGION_BY_STATE[code], NATIONAL].filter(
    (s): s is GasSeries => !!s,
  );
}
