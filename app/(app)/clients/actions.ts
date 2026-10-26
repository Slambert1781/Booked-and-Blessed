"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CLIENT_KINDS, type ClientKind, type ClientSummary } from "@/lib/clients";
import { isTier, type Tier } from "@/lib/relationships";
import { createClient } from "@/lib/supabase/server";

export type ClientInput = { name: string; kind: ClientKind; tier: Tier; notes?: string };

function clean(input: ClientInput): { error: string } | { name: string; kind: ClientKind; tier: Tier; notes: string | null } {
  const name = input.name.trim();
  if (!name) return { error: "Enter the client's name." };
  if (name.length > 120) return { error: "That name is too long." };
  if (!CLIENT_KINDS.includes(input.kind)) return { error: "Choose what kind of client this is." };
  if (!isTier(input.tier)) return { error: "Choose a relationship tier." };
  return { name, kind: input.kind, tier: input.tier, notes: input.notes?.trim() || null };
}

const friendly = (code?: string) =>
  code === "42P01" || code === "PGRST205"
    ? "The database needs the client directory update first (the clients SQL script)."
    : "Couldn't save the client. Please try again.";

/** Add a client and return it (used from the gig form without leaving it). */
export async function addClient(input: ClientInput): Promise<{ client: ClientSummary } | { error: string }> {
  const c = clean(input);
  if ("error" in c) return c;
  const supabase = await createClient();
  const { data, error } = await supabase.from("clients").insert(c).select("id, name, kind, tier").single();
  if (error || !data) return { error: friendly(error?.code) };
  revalidatePath("/clients");
  return { client: data as ClientSummary };
}

/** Add a client from the Clients page and open it. */
export async function createClientAndOpen(input: ClientInput): Promise<{ error: string } | void> {
  const r = await addClient(input);
  if ("error" in r) return r;
  redirect(`/clients/${r.client.id}`);
}

export async function updateClient(id: string, input: ClientInput): Promise<{ error: string } | void> {
  const c = clean(input);
  if ("error" in c) return c;
  const supabase = await createClient();
  const { error } = await supabase.from("clients").update(c).eq("id", id);
  if (error) return { error: friendly(error.code) };
  revalidatePath("/", "layout");
}

export async function deleteClient(id: string) {
  const supabase = await createClient();
  await supabase.from("clients").delete().eq("id", id);
  revalidatePath("/", "layout");
  redirect("/clients");
}
