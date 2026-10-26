import "server-only";

// Google Places API (New). Server only; the key never reaches the browser.
const BASE = "https://places.googleapis.com/v1";

export type Suggestion = { placeId: string; text: string };
export type PlaceDetails = {
  address: string;
  lat: number;
  lng: number;
  state: string | null; // two-letter code
};

function key() {
  const k = process.env.GOOGLE_MAPS_API_KEY;
  if (!k) throw new Error("GOOGLE_MAPS_API_KEY is not set");
  return k;
}

export async function autocomplete(
  input: string,
  sessionToken: string,
  near?: { lat: number; lng: number } | null,
): Promise<Suggestion[]> {
  const res = await fetch(`${BASE}/places:autocomplete`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key() },
    body: JSON.stringify({
      input,
      sessionToken,
      includedRegionCodes: ["us"],
      // Prefer places near home (a bias, not a limit: far venues still appear).
      ...(near && {
        locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: 50000 } },
        origin: { latitude: near.lat, longitude: near.lng },
      }),
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Places autocomplete ${res.status}`);
  const data = (await res.json()) as {
    suggestions?: { placePrediction?: { placeId: string; text?: { text: string } } }[];
  };
  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is { placeId: string; text: { text: string } } => !!p?.placeId && !!p.text)
    .map((p) => ({ placeId: p.placeId, text: p.text.text }));
}

export async function placeDetails(placeId: string, sessionToken: string): Promise<PlaceDetails> {
  const q = new URLSearchParams({ sessionToken });
  const res = await fetch(`${BASE}/places/${encodeURIComponent(placeId)}?${q}`, {
    headers: {
      "X-Goog-Api-Key": key(),
      "X-Goog-FieldMask": "formattedAddress,location,addressComponents",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Place details ${res.status}`);
  const data = (await res.json()) as {
    formattedAddress: string;
    location: { latitude: number; longitude: number };
    addressComponents?: { shortText: string; types: string[] }[];
  };
  const state =
    data.addressComponents?.find((c) => c.types.includes("administrative_area_level_1"))
      ?.shortText ?? null;
  return {
    address: data.formattedAddress,
    lat: data.location.latitude,
    lng: data.location.longitude,
    state,
  };
}

/**
 * Best match for a typed address (Places Text Search), restricted to the US.
 * Used when an address wasn't picked from the suggestions, so it has no
 * coordinates; include the state in `text` to avoid same-named streets elsewhere.
 */
export async function findAddress(text: string): Promise<PlaceDetails | null> {
  const res = await fetch(`${BASE}/places:searchText`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key(),
      "X-Goog-FieldMask": "places.formattedAddress,places.location,places.addressComponents",
    },
    body: JSON.stringify({ textQuery: text, regionCode: "us", pageSize: 1 }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Places text search ${res.status}`);
  const data = (await res.json()) as {
    places?: {
      formattedAddress: string;
      location: { latitude: number; longitude: number };
      addressComponents?: { shortText: string; types: string[] }[];
    }[];
  };
  const p = data.places?.[0];
  if (!p) return null;
  return {
    address: p.formattedAddress,
    lat: p.location.latitude,
    lng: p.location.longitude,
    state: p.addressComponents?.find((c) => c.types.includes("administrative_area_level_1"))?.shortText ?? null,
  };
}

/** "1810 15th Ave SW" + "OR" -> "1810 15th Ave SW, OR" (unless the state is already in it). */
export function withState(address: string, state: string | null | undefined): string {
  if (!state) return address;
  return new RegExp(`\\b${state}\\b`, "i").test(address) ? address : `${address}, ${state}`;
}
