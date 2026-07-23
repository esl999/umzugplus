import { createClient } from "@supabase/supabase-js";

// NUR für serverseitige Nutzung (API-Routen). Niemals in Client-Komponenten importieren.
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
