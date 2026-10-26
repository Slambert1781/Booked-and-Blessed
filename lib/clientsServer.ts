import "server-only";
import type { ClientRow, ClientSummary } from "@/lib/clients";
import { createClient } from "@/lib/supabase/server";

/** The user's clients, A–Z. Empty until the client directory SQL has been run. */
export async function listClients(): Promise<ClientSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").select("id, name, kind, tier").order("name");
  return error ? [] : ((data ?? []) as ClientSummary[]);
}

export async function getClient(id: string | null | undefined): Promise<ClientRow | null> {
  if (!id) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("*").eq("id", id).maybeSingle<ClientRow>();
  return data ?? null;
}
