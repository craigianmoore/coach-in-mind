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
import { introCapFor, isActivated } from "@/lib/coachPool";
import { scoreClub2CoachMatch, scoreCoach2MentorMatch } from "@/lib/scoring";
import { APP_URL } from "@/lib/server/sendEmail";
import { sendAdminEmail } from "@/lib/server/sendAdminEmail";
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

// One suggestion waiting for an admin decision, used to build the "match to decide" email.
type NewSuggestion = { target: string; candidate: string; score: number; strengths: string[] };

const STRENGTH_LABELS: Record<string, string> = {
  accreditation: "accreditation", ability: "ability", competition_level: "competition level", age_group: "age group",
  geography: "location", salary: "pay", gender: "gender preference", specialism_overlap: "specialisms",
  career_stage: "career stage", availability: "availability", budget_fit: "budget",
};

// The two or three components this pair scores best on, in plain words.
function topStrengths(b: object): string[] {
  return Object.entries(b as Record<string, unknown>)
    .filter(([k, v]) => k in STRENGTH_LABELS && typeof v === "number" && v > 0)
    .sort((x, y) => (y[1] as number) - (x[1] as number))
    .slice(0, 3)
    .map(([k]) => STRENGTH_LABELS[k]);
}

// Emails the admin inbox once per sweep that produced new suggestions needing a decision: each coach or vacancy
// with its candidates ranked best first and the top one flagged as the recommendation. Best-effort — never throws.
async function emailAdminSuggestions(product: "club2coach" | "coach2mentor", items: NewSuggestion[]) {
  if (items.length === 0) return;
  try {
    const groups = new Map<string, NewSuggestion[]>();
    for (const it of items) groups.set(it.target, [...(groups.get(it.target) ?? []), it]);
    const blocks: string[] = [];
    for (const [target, list] of Array.from(groups.entries())) {
      const ranked = [...list].sort((a, b) => b.score - a.score);
      const lines = ranked.map((c, i) => {
        const why = c.strengths.length ? ` — strongest on ${c.strengths.join(", ")}` : "";
        const tag = i === 0 ? (ranked.length > 1 ? "RECOMMENDED: " : "Suggested: ") : `${i + 1}. `;
        return `${tag}${c.candidate} (score ${Math.round(c.score)})${why}`;
      });
      blocks.push(`${target}\n${lines.join("\n")}`);
    }
    const label = product === "club2coach" ? "Club 2 Coach" : "Coach 2 Mentor";
    const n = items.length;
    await sendAdminEmail(
      `${label}: ${n} match${n === 1 ? "" : "es"} to decide`,
      `${n} new suggested ${n === 1 ? "match is" : "matches are"} waiting for your approval. Candidates are ranked by score, and the first one listed is my pick. It's a starting point for your judgement, not a decision.\n\n${blocks.join("\n\n")}\n\nReview and approve here:\n${APP_URL}/${product}/admin`
    );
  } catch (err) {
    console.error("Admin suggestion email failed", err);
  }
}

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

  // A refunded listing keeps paid=true for the record, so it must be
  // excluded from "active" explicitly — it isn't caught by the
  // placed/filled/expired checks alone.
  // A coach is matchable only while their activation window is open (Activate button).
  // One credit = up to 3 club introductions (5 for activations before 13 Oct 2026) in the 30 days: a coach at the cap is done.
  const introsThisActivation = (l: Club2CoachCoachListing) =>
    shares.filter((s) => s.coach_listing_id === l.id && s.status === "approved" && !!l.activated_at && s.shared_at >= l.activated_at).length;
  const activeCoaches = coachListings.filter((l) => isActivated(l) && introsThisActivation(l) < introCapFor(l.activated_at));
  const activeVacancies = vacancies.filter(
    (v) =>
      v.paid &&
      v.status !== "filled" &&
      v.status !== "expired" &&
      v.status !== "refunded" &&
      v.status !== "superseded" && // retired by its own club via Repost — the new vacancy is what's live
      !v.deleted_at
  );
  const sharedPairs = new Set(shares.map((s) => `${s.coach_listing_id}:${s.club_vacancy_id}`));
  // A coach can hold several listings (one per role). Never introduce the same coach to the same club
  // twice through different listings: remember which (coach, club contact) pairs already have a share.
  const listingOwner = new Map(coachListings.map((l) => [l.id, l.person_id]));
  const vacancyOwner = new Map(vacancies.map((v) => [v.id, v.person_id]));
  const coachClubPairs = new Map<string, Set<string>>(); // `${coachPerson}:${clubPerson}` -> listing ids already shared
  for (const s of shares) {
    const key = `${listingOwner.get(s.coach_listing_id)}:${vacancyOwner.get(s.club_vacancy_id)}`;
    if (!coachClubPairs.has(key)) coachClubPairs.set(key, new Set());
    coachClubPairs.get(key)!.add(s.coach_listing_id);
  }
  const sharedWithClubViaOtherListing = (coach: Club2CoachCoachListing, vacancy: Club2CoachClubVacancy) => {
    const ids = coachClubPairs.get(`${coach.person_id}:${vacancy.person_id}`);
    return !!ids && Array.from(ids).some((id) => id !== coach.id);
  };

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

  // Counts approvals made in this run, so a coach can't go past the cap between database reads.
  const runIntros = new Map<string, number>();
  let totalNew = 0;
  const fresh: NewSuggestion[] = [];
  for (const vacancy of targets) {
    const usedSlots = shares.filter((s) => s.club_vacancy_id === vacancy.id).length;
    const remaining = (vacancy.included_introductions ?? 0) - usedSlots;
    if (remaining <= 0) continue;

    const candidates = activeCoaches
      .filter((c) => introsThisActivation(c) + (runIntros.get(c.id) ?? 0) < introCapFor(c.activated_at) && !sharedPairs.has(`${c.id}:${vacancy.id}`) && !sharedWithClubViaOtherListing(c, vacancy))
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
        const pairKey = `${coach.person_id}:${vacancy.person_id}`;
        if (!coachClubPairs.has(pairKey)) coachClubPairs.set(pairKey, new Set());
        coachClubPairs.get(pairKey)!.add(coach.id);
        if (!autoApprove) {
          fresh.push({
            target: `${vacancy.role_being_recruited} at ${vacancy.club_name}`,
            candidate: people[coach.person_id]?.full_name ?? "A coach",
            score: breakdown.total,
            strengths: topStrengths(breakdown),
          });
        }
        if (autoApprove) runIntros.set(coach.id, (runIntros.get(coach.id) ?? 0) + 1);
        if (autoApprove && !vacancy.shared_at) {
          await supabase
            .from("club2coach_club_vacancies")
            .update({ shared_at: new Date().toISOString() })
            .eq("id", vacancy.id);
        }
      }
    }
  }
  await emailAdminSuggestions("club2coach", fresh);
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

  function mentorAcceptedCount(mentorId: string) {
    return requests.filter((r) => r.mentor_listing_id === mentorId && r.status === "accepted").length;
  }

  // A coach is matchable only while their activation window is open (Activate button).
  const activeCoaches = coachListings.filter((l) => isActivated(l));
  // Mentor's own status must actively be "active" (not just non-excluded),
  // so "refunded" is already excluded here without needing a separate check.
  const activeMentors = mentorListings.filter((m) => {
    if (!m.paid || m.deleted_at || m.status !== "active" || !m.currently_open) return false;
    if (!m.verified_at) return false; // only mentors an admin has verified are ever introduced
    if (m.max_mentees != null && mentorAcceptedCount(m.id) >= m.max_mentees) return false;
    return true;
  });

  let totalNew = 0;
  const fresh: NewSuggestion[] = [];
  for (const coach of activeCoaches) {
    const rows = requests.filter((r) => r.coach_listing_id === coach.id);
    // The activation window (not an introduction count) limits a coach, so
    // pace it instead: at most 3 mentor suggestions/requests open at once.
    const openNow = rows.filter((r) => r.status === "suggested" || r.status === "pending").length;
    const remaining = Math.max(0, 3 - openNow);
    if (remaining <= 0) continue;

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
      if (!error) {
        totalNew += 1;
        if (!autoApprove) {
          fresh.push({
            target: `${coachPerson?.full_name ?? "A coach"} (seeking a mentor)`,
            candidate: people[mentor.person_id]?.full_name ?? "A mentor",
            score: breakdown.total,
            strengths: topStrengths(breakdown),
          });
        }
      }
    }
  }
  await emailAdminSuggestions("coach2mentor", fresh);
  return { totalNew };
}
