// Coach credits: one bank per coach, shared across Club 2 Coach and
// Coach 2 Mentor. Credits never expire while they sit in the bank. Using
// one (the Activate button) puts ONE listing into matching: 30 days on Club 2 Coach (up to CLUB_INTRO_CAP club
// introductions in that time; lib/server/notifyMatches.ts closeUsedActivations ends it early at the cap),
// 60 days on Coach 2 Mentor. Once it ends the coach spends another credit to be matched again.
import type { SupabaseClient } from "@supabase/supabase-js";

export const COACH_ACTIVE_DAYS = { club2coach: 30, coach2mentor: 60 } as const;
// Club 2 Coach: one credit = 30 days of being shown to clubs, up to 5 club introductions in that time.
export const CLUB_INTRO_CAP = 5;
// Refund window (days after pressing Activate) when no introduction was made: opens 5 days after the window ends, open for 45 days.
export const REFUND_OPENS_DAY = { club2coach: 35, coach2mentor: 90 } as const;

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
