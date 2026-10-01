// Server-side match sweeps — the same logic the two Admin pages run
// client-side when you open the "Matches" tab or click "Re-run
// auto-match now", extracted so it can also run unattended: from the
// hourly cron (app/api/cron/match-sweep/route.ts) and immediately
// after a Stripe payment (app/api/stripe/webhook/route.ts). Always
// call these with the service-role client (lib/supabase/service.ts) —
// there's no logged-in admin session in either of those contexts.
//
// Keep this in sync with the client-side versions in
// app/club2coach/admin/page.tsx and app/coach2mentor/admin/page.tsx if
// the matching rules ever change there.
import type { SupabaseClient } from "@supabase/supabase-js";
import { scoreClub2CoachMatch, scoreCoach2MentorMatch } from "@/lib/scoring";
import type {
  Club2CoachCoachListing,
  Club2CoachClubVacancy,
  Club2CoachShare,
  Club2CoachWeights,
  Coach2MentorCoachListing,
  Coach2MentorMentorListing,
  Coach2MentorRequest,
  Coach2MentorWeights,
  Person,
  AdminSettings,
} from "@/types/database";

export async function runClub2CoachMatchSweep(
  supabase: SupabaseClient,
  opts: { vacancyIds?: string[] } = {}
): Promise<{ totalNew: number }> {
  const [{ data: cl }, { data: cv }, { data: ppl }, { data: sh }, { data: st }] = await Promise.all([
    supabase.from("club2coach_coach_listings").select("*"),
    supabase.from("club2coach_club_vacancies").select("*"),
    supabase.from("people").select("*"),
    supabase.from("club2coach_shares").select("*"),
    supabase.from("admin_settings").select("*").eq("product", "club2coach").maybeSingle(),
  ]);

  const coachListings = (cl as Club2CoachCoachListing[]) ?? [];
  const vacancies = (cv as Club2CoachClubVacancy[]) ?? [];
  const people: Record<string, Person> = {};
  ((ppl as Person[]) ?? []).forEach((p) => (people[p.id] = p));
  const shares = (sh as Club2CoachShare[]) ?? [];
  const settings = st as AdminSettings | null;
  const weights = settings?.weights as Club2CoachWeights | undefined;
  if (!weights) return { totalNew: 0 };
  const autoApprove = settings?.auto_approve_matches ?? false;

  function coachIntroductionsUsed(coachListingId: string) {
    return shares.filter((s) => s.coach_listing_id === coachListingId).length;
  }

  // A refunded listing keeps paid=true for the record, so it must be
  // excluded from "active" explicitly — it isn't caught by the
  // placed/filled/expired checks alone.
  const activeCoaches = coachListings.filter((l) => {
    if (!l.paid || l.status === "placed" || l.status === "refunded" || l.deleted_at) return false;
    if (l.included_introductions != null && coachIntroductionsUsed(l.id) >= l.included_introductions) return false;
    return true;
  });
  const activeVacancies = vacancies.filter(
    (v) => v.paid && v.status !== "filled" && v.status !== "expired" && v.status !== "refunded" && !v.deleted_at
  );
  const sharedPairs = new Set(shares.map((s) => `${s.coach_listing_id}:${s.club_vacancy_id}`));

  // A vacancy with an approved-but-unresolved introduction is held back
  // from any further match (manual or auto) until the club says what
  // happened with it — every match is still paid for the moment it's
  // made, this just paces how many a club can be charged for in a row
  // without telling us how the last one went.
  const awaitingOutcome = new Set(
    shares.filter((s) => s.status === "approved" && s.outcome === "pending").map((s) => s.club_vacancy_id)
  );

  const targets = activeVacancies.filter((v) => {
    if (opts.vacancyIds && !opts.vacancyIds.includes(v.id)) return false;
    if (v.included_introductions == null) return false;
    if (awaitingOutcome.has(v.id)) return false;
    const usedSlots = shares.filter((s) => s.club_vacancy_id === v.id).length;
    return usedSlots < v.included_introductions;
  });

  let totalNew = 0;
  for (const vacancy of targets) {
    const usedSlots = shares.filter((s) => s.club_vacancy_id === vacancy.id).length;
    const remaining = (vacancy.included_introductions ?? 0) - usedSlots;
    if (remaining <= 0) continue;

    const candidates = activeCoaches
      .filter((c) => !sharedPairs.has(`${c.id}:${vacancy.id}`))
      .map((coach) => {
        const coachPerson = people[coach.person_id];
        const vacancyWeights = vacancy.personal_weights ?? weights;
        const breakdown = scoreClub2CoachMatch(coach, coachPerson?.current_licence ?? null, vacancy, vacancyWeights);
        return { coach, breakdown };
      })
      .filter(({ breakdown }) => breakdown.eligible)
      .sort((a, b) => b.breakdown.total - a.breakdown.total)
      .slice(0, remaining);

    for (const { coach, breakdown } of candidates) {
      const { error } = await supabase.from("club2coach_shares").insert({
        coach_listing_id: coach.id,
        club_vacancy_id: vacancy.id,
        score: breakdown.total,
        admin_notes: "Auto-matched (top score)",
        status: autoApprove ? "approved" : "suggested",
      });
      if (!error) {
        totalNew += 1;
        if (autoApprove && !vacancy.shared_at) {
          await supabase
            .from("club2coach_club_vacancies")
            .update({ shared_at: new Date().toISOString() })
            .eq("id", vacancy.id);
        }
      }
    }
  }
  return { totalNew };
}

export async function runCoach2MentorMatchSweep(supabase: SupabaseClient): Promise<{ totalNew: number }> {
  const [{ data: cl }, { data: ml }, { data: ppl }, { data: rq }, { data: st }] = await Promise.all([
    supabase.from("coach2mentor_coach_listings").select("*"),
    supabase.from("coach2mentor_mentor_listings").select("*"),
    supabase.from("people").select("*"),
    supabase.from("coach2mentor_requests").select("*"),
    supabase.from("admin_settings").select("*").eq("product", "coach2mentor").maybeSingle(),
  ]);

  const coachListings = (cl as Coach2MentorCoachListing[]) ?? [];
  const mentorListings = (ml as Coach2MentorMentorListing[]) ?? [];
  const people: Record<string, Person> = {};
  ((ppl as Person[]) ?? []).forEach((p) => (people[p.id] = p));
  const requests = (rq as Coach2MentorRequest[]) ?? [];
  const settings = st as AdminSettings | null;
  const weights = settings?.weights as Coach2MentorWeights | undefined;
  if (!weights) return { totalNew: 0 };
  const autoApprove = settings?.auto_approve_matches ?? false;

  function coachUsedSlots(coachId: string) {
    return requests.filter((r) => r.coach_listing_id === coachId && r.status !== "declined").length;
  }
  function mentorAcceptedCount(mentorId: string) {
    return requests.filter((r) => r.mentor_listing_id === mentorId && r.status === "accepted").length;
  }

  const activeCoaches = coachListings.filter(
    (l) => l.paid && l.status !== "placed" && l.status !== "refunded" && !l.deleted_at
  );
  // Mentor's own status must actively be "active" (not just non-excluded),
  // so "refunded" is already excluded here without needing a separate check.
  const activeMentors = mentorListings.filter((m) => {
    if (!m.paid || m.deleted_at || m.status !== "active" || !m.currently_open) return false;
    if (m.max_mentees != null && mentorAcceptedCount(m.id) >= m.max_mentees) return false;
    return true;
  });

  let totalNew = 0;
  for (const coach of activeCoaches) {
    const rows = requests.filter((r) => r.coach_listing_id === coach.id);
    const usedSlots = coachUsedSlots(coach.id);
    const entitled = coach.included_introductions;
    const remaining = entitled != null ? Math.max(0, entitled - usedSlots) : null;
    if (remaining == null || remaining <= 0) continue;

    const coachWeights = coach.personal_weights ?? weights;
    const coachPerson = people[coach.person_id];
    const requestedMentorIds = new Set(rows.map((r) => r.mentor_listing_id));
    const candidates = activeMentors
      .filter((m) => !requestedMentorIds.has(m.id))
      .map((mentor) => {
        const breakdown = scoreCoach2MentorMatch(
          coach,
          coachPerson?.region ?? null,
          mentor,
          coachWeights,
          coachPerson?.current_licence ?? null
        );
        return { mentor, breakdown };
      })
      .sort((a, b) => b.breakdown.total - a.breakdown.total)
      .slice(0, remaining);

    for (const { mentor, breakdown } of candidates) {
      const { error } = await supabase.from("coach2mentor_requests").insert({
        coach_listing_id: coach.id,
        mentor_listing_id: mentor.id,
        score: breakdown.total,
        admin_notes: "Auto-matched (top score)",
        status: autoApprove ? "pending" : "suggested",
      });
      if (!error) totalNew += 1;
    }
  }
  return { totalNew };
}
