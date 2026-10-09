// Per-user rate limiting backed by the database function rate_limit_hit()
// (see supabase/migration_rate_limit_and_deletion.sql). The function
// identifies the caller from their session itself, so one user can't
// burn another user's allowance.
//
// Fails OPEN: if the function isn't installed yet or the database errors,
// requests are allowed (and the problem is logged) rather than locking
// real users out of support or notifications.
import type { SupabaseClient } from "@supabase/supabase-js";

export async function isRateLimited(
  supabase: SupabaseClient,
  endpoint: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  const { data, error } = await supabase.rpc("rate_limit_hit", {
    p_endpoint: endpoint,
    p_max: max,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("rate_limit_hit failed (allowing request):", endpoint, error.message);
    return false;
  }
  return data === false; // function returns true when the request is allowed
}
