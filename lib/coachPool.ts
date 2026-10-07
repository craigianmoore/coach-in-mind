// Coach credits: one bank per coach, shared across Club 2 Coach and
// Coach 2 Mentor. Credits never expire while they sit in the bank. Using
// one (the Activate button) puts ONE listing into matching for a fixed
// window — 60 days on Club 2 Coach, 180 days on Coach 2 Mentor — after
// which that credit is gone and the coach spends another to re-apply.
import type { SupabaseClient } from "@supabase/supabase-js";

export const COACH_ACTIVE_DAYS = { club2coach: 60, coach2mentor: 180 } as const;

export type PoolRow = { person_id: string; entitled: number; used: number; any_paid: boolean };

// Credits left in a coach's bank (own row for a coach; any row for admin/service).
export async function loadCoachBank(supabase: SupabaseClient): Promise<number> {
  const { data } = await supabase.rpc("coach_pool_totals");
  const row = ((data as PoolRow[]) ?? [])[0];
  return row ? Math.max(0, row.entitled - row.used) : 0;
}

// A coach listing is in matching only while its activation window is open.
export function isActivated(l: {
  status: string;
  deleted_at?: string | null;
  active_until?: string | null;
}): boolean {
  if (l.deleted_at || l.status !== "active" || !l.active_until) return false;
  return new Date(l.active_until).getTime() > Date.now();
}

export function daysLeft(activeUntil: string): number {
  return Math.max(0, Math.ceil((new Date(activeUntil).getTime() - Date.now()) / 86400000));
}
