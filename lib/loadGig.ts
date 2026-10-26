import "server-only";
import type { GigRow, ServiceRow } from "@/lib/gigs";
import { createClient } from "@/lib/supabase/server";

/** A gig and its services (ordered), or null if it isn't the user's. */
export async function loadGig(id: string): Promise<{ gig: GigRow; services: ServiceRow[] } | null> {
  const supabase = await createClient();
  const { data: gig } = await supabase.from("gigs").select("*").eq("id", id).maybeSingle<GigRow>();
  if (!gig) return null;
  const { data: services } = await supabase
    .from("gig_services")
    .select("id, service_date, start_time")
    .eq("gig_id", id)
    .order("service_date")
    .order("start_time", { nullsFirst: true })
    .returns<ServiceRow[]>();
  return { gig, services: services ?? [] };
}
