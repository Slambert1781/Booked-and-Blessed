import "server-only";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

// Service-role client that bypasses RLS. Server code only; used solely to
// write the shared gas price cache.
export function createAdminClient() {
  return createClient(
    SUPABASE_URL,
    (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim(),
    { auth: { persistSession: false } },
  );
}
