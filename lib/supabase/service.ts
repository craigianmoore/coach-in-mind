// Server-only Supabase client using the SERVICE ROLE key, which
// bypasses Row Level Security entirely. Only ever use this from
// trusted server code that has independently verified what it's
// doing (the Stripe webhook, specifically) — never expose this
// client, or the service role key, to the browser.
import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set.");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set — add it to .env.local (and Vercel's Environment Variables). Find it in Supabase: Settings > API > service_role key.");
}

export function createServiceClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
