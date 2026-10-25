"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { GIG_STATUSES, type GigStatus } from "@/lib/gigs";
import { createClient } from "@/lib/supabase/server";

export async function deleteGig(id: string) {
  const supabase = await createClient();
  await supabase.from("gigs").delete().eq("id", id);
  redirect("/");
}

export async function setGigStatus(id: string, status: GigStatus): Promise<{ error: string } | void> {
  if (!GIG_STATUSES.includes(status)) return { error: "Unknown choice." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("gigs")
    .update({ status, decided_at: status === "undecided" ? null : new Date().toISOString() })
    .eq("id", id);
  if (error) {
    return {
      error:
        error.code === "42703" || error.code === "PGRST204"
          ? "The database needs a quick update before you can do this (see setup step: gig_status SQL)."
          : "Couldn't save your decision. Please try again.",
    };
  }
  revalidatePath("/", "layout");
}
