import { NextResponse, type NextRequest } from "next/server";
import { placeDetails } from "@/lib/google/places";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  const session = request.nextUrl.searchParams.get("session") ?? "";
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  try {
    return NextResponse.json(await placeDetails(id, session));
  } catch {
    return NextResponse.json({ error: "Address lookup unavailable" }, { status: 502 });
  }
}
