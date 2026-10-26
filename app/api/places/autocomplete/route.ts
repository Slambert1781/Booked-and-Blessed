import { NextResponse, type NextRequest } from "next/server";
import { autocomplete } from "@/lib/google/places";
import { getProfile } from "@/lib/profile";

export async function GET(request: NextRequest) {
  const me = await getProfile();
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const home = me.profile;
  const near = home?.home_lat != null && home?.home_lng != null ? { lat: home.home_lat, lng: home.home_lng } : null;

  const input = request.nextUrl.searchParams.get("input")?.trim() ?? "";
  const session = request.nextUrl.searchParams.get("session") ?? "";
  if (input.length < 3) return NextResponse.json({ suggestions: [] });

  try {
    return NextResponse.json({ suggestions: await autocomplete(input, session, near) });
  } catch {
    return NextResponse.json({ error: "Address search unavailable" }, { status: 502 });
  }
}
