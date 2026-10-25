"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function deleteGig(id: string) {
  const supabase = await createClient();
  await supabase.from("gigs").delete().eq("id", id);
  redirect("/");
}
