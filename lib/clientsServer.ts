import "server-only";
import { parseGigDefaults, type ClientRow, type ClientSummary } from "@/lib/clients";
import { createClient } from "@/lib/supabase/server";

/** The user's clients, A–Z. Empty until the client directory SQL has been run. */
export async function listClients(): Promise<ClientSummary[]> {
  const supabase = await createClient();
  // "*" so this still works before the gig_defaults column exists.
  const { data, error } = await supabase.from("clients").select("*").order("name");
  if (error) return [];
  return (data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    tier: c.tier,
    gigDefaults: parseGigDefaults(c.gig_defaults),
  }));
}

export async function getClient(id: string | null | undefined): Promise<ClientRow | null> {
  if (!id) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("*").eq("id", id).maybeSingle<ClientRow>();
  return data ?? null;
}
