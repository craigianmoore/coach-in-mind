// One shared pool of introduction credits per coach, across Club 2 Coach
// AND Coach 2 Mentor. Credits bought (or the founding credit) on either
// listing are added together; every introduction on either side draws
// from the same total. The numbers come from the coach_pool_totals()
// database function so the server sweeps, both admin pages and the coach
// pages all agree.
import type { SupabaseClient } from "@supabase/supabase-js";

export type PoolRow = { person_id: string; entitled: number; used: number; any_paid: boolean };
export type Pool = Map<string, PoolRow>;

export async function loadCoachPool(supabase: SupabaseClient): Promise<Pool> {
  const { data } = await supabase.rpc("coach_pool_totals");
  const pool: Pool = new Map();
  ((data as PoolRow[]) ?? []).forEach((r) => pool.set(r.person_id, r));
  return pool;
}

export function poolRemaining(pool: Pool, personId: string): number {
  const p = pool.get(personId);
  if (!p || !p.any_paid) return 0;
  return Math.max(0, p.entitled - p.used);
}

// A listing can be matched when it is live (not a draft, placed, refunded
// or deleted) and its owner still has credits left in the shared pool.
export function listingMatchable(
  l: { person_id: string; status: string; deleted_at?: string | null },
  pool: Pool
): boolean {
  if (l.deleted_at || ["draft", "placed", "refunded"].includes(l.status)) return false;
  return poolRemaining(pool, l.person_id) > 0;
}
