import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { ProfileRow } from "@/lib/types";

export type Me = {
  userId: string;
  email: string;
  name: string; // stored in the auth user's metadata
  avatarUrl: string | null; // likewise
  profile: ProfileRow | null;
};

// Cached per request, so the page and the sidebar share one lookup.
export const getProfile = cache(async (): Promise<Me | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).maybeSingle();
  return {
    userId: user.id,
    email: user.email ?? "",
    name: String(user.user_metadata?.full_name ?? "").trim(),
    avatarUrl: typeof user.user_metadata?.avatar_url === "string" ? user.user_metadata.avatar_url : null,
    profile: data as ProfileRow | null,
  };
});
