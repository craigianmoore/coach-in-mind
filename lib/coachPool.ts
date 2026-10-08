// Coach credits: one bank per coach, shared across Club 2 Coach and
// Coach 2 Mentor. Credits never expire while they sit in the bank. Using
// one (the Activate button) puts ONE listing into matching for up to 60 days.
// Club 2 Coach: the credit is used when a club introduction is approved (lib/server/notifyMatches.ts
// closeUsedActivations). Coach 2 Mentor: the credit covers the 60 days. Either way, once it is used
// the coach spends another to be matched again.
import type { SupabaseClient } from "@supabase/supabase-js";

export const COACH_ACTIVE_DAYS = { club2coach: 60, coach2mentor: 60 } as const;

export type PoolRow = { person_id: string; entitled: number; used: number; any_paid: boolean };

// Credits left in a coach's bank (own row for a coach; any row for admin/service).
export async function loadCoachBank(supabase: SupabaseClient, personId: string): Promise<number> {
  const { data } = await supabase.rpc("coach_pool_totals");
  // Admins get every coach's row back, so pick this coach's own.
  const row = ((data as PoolRow[]) ?? []).find((r) => r.person_id === personId);
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
