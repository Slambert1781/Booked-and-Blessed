// Supabase settings, tidied up so a pasted value with extra bits still works
// (e.g. a URL copied as https://xyz.supabase.co/rest/v1/ or with a trailing space).
function cleanUrl(raw: string | undefined): string {
  const value = (raw ?? "").trim().replace(/^["']|["']$/g, "");
  try {
    return new URL(value).origin;
  } catch {
    return value;
  }
}

export const SUPABASE_URL = cleanUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
export const SUPABASE_ANON_KEY = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();
