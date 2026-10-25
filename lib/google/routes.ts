import "server-only";

// Google Routes API. One-way driving distance and duration.
type Place = { address: string; lat: number | null; lng: number | null };

const waypoint = (p: Place) =>
  p.lat !== null && p.lng !== null
    ? { location: { latLng: { latitude: p.lat, longitude: p.lng } } }
    : { address: p.address };

export async function oneWayDrive(from: Place, to: Place): Promise<{ miles: number; minutes: number }> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) throw new Error("GOOGLE_MAPS_API_KEY is not set");
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration",
    },
    body: JSON.stringify({
      origin: waypoint(from),
      destination: waypoint(to),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_UNAWARE",
      units: "IMPERIAL",
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Routes ${res.status}`);
  const data = (await res.json()) as { routes?: { distanceMeters?: number; duration?: string }[] };
  const route = data.routes?.[0];
  if (!route?.distanceMeters || !route.duration) throw new Error("No route found");
  return {
    miles: route.distanceMeters / 1609.344,
    minutes: parseFloat(route.duration) / 60, // duration is like "3121s"
  };
}
