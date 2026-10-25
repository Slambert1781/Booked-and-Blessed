import "server-only";
import { createClient } from "@supabase/supabase-js";

// Service-role client that bypasses RLS. Server code only; used solely to
// write the shared gas price cache.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}
