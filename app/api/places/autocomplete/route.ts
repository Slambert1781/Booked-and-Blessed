import { NextResponse, type NextRequest } from "next/server";
import { autocomplete } from "@/lib/google/places";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const input = request.nextUrl.searchParams.get("input")?.trim() ?? "";
  const session = request.nextUrl.searchParams.get("session") ?? "";
  if (input.length < 3) return NextResponse.json({ suggestions: [] });

  try {
    return NextResponse.json({ suggestions: await autocomplete(input, session) });
  } catch {
    return NextResponse.json({ error: "Address search unavailable" }, { status: 502 });
  }
}
