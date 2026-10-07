import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendAdminEmail } from "@/lib/server/sendAdminEmail";

// Daily check for the 4-month refund window in the Terms of Service
// (§5): if no introduction has been made under a paid introduction
// package within 4 months of payment, the payer is entitled to a
// refund on request. This doesn't refund anyone automatically — it's
// a reminder so the admin can proactively reach out or process a
// refund before/when a customer asks for one.
//
// Covers the three listing types that actually sell a package of N
// introductions (club2coach coach & club, coach2mentor coach). Mentor
// listings on Coach2Mentor pay for a season of matching capacity
// rather than a fixed introduction count, so they're out of scope for
// this specific clause.
//
// Triggered by Vercel Cron (see vercel.json) once a day. Protected by
// CRON_SECRET — Vercel automatically sends this as a Bearer token
// when the env var is set on the project.

const WARNING_DAYS_BEFORE = 14;

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

interface Candidate {
  table: "club2coach_coach_listings" | "club2coach_club_vacancies" | "coach2mentor_coach_listings";
  id: string;
  person_id: string;
  paid_at: string;
  price_aud: number | null;
  refund_reminder_sent_at: string | null;
  refund_window_notified_at: string | null;
  label: string; // human-readable description for the email
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
  } else {
    console.warn("CRON_SECRET is not set — /api/cron/refund-reminders is unprotected.");
  }

  const supabase = createServiceClient();
  const now = new Date();

  const candidates: Candidate[] = [];

  // Coach listings are deliberately NOT chased: a coach credit is $20 or less, so
  // refunds there are handled on request via Support rather than by daily reminders.

  // --- Club2Coach: club vacancies (pay to be introduced to coaches) ---
  const { data: vacancies } = await supabase
    .from("club2coach_club_vacancies")
    .select(
      "id, person_id, paid_at, price_aud, refund_reminder_sent_at, refund_window_notified_at, club_name, role_being_recruited"
    )
    .eq("paid", true)
    .or("price_aud.is.null,price_aud.gt.0") // free introductions have nothing to refund
    .eq("is_charity", false)
    .is("deleted_at", null)
    .is("refund_window_notified_at", null)
    .is("refunded_at", null)
    .not("paid_at", "is", null);
  for (const v of vacancies ?? []) {
    candidates.push({
      table: "club2coach_club_vacancies",
      id: v.id,
      person_id: v.person_id,
      paid_at: v.paid_at,
      price_aud: v.price_aud,
      refund_reminder_sent_at: v.refund_reminder_sent_at,
      refund_window_notified_at: v.refund_window_notified_at,
      label: `Club2Coach vacancy (${v.club_name} — ${v.role_being_recruited})`,
    });
  }

  if (candidates.length === 0) {
    return NextResponse.json({ ok: true, checked: 0, reminders: 0 });
  }

  // Work out which candidates have already received an introduction —
  // those are excluded regardless of how much time has passed.
  const c2cCoachIds = candidates.filter((c) => c.table === "club2coach_coach_listings").map((c) => c.id);
  const c2cVacancyIds = candidates.filter((c) => c.table === "club2coach_club_vacancies").map((c) => c.id);
  const c2mCoachIds = candidates.filter((c) => c.table === "coach2mentor_coach_listings").map((c) => c.id);

  const introducedCoachListingIds = new Set<string>();
  const introducedVacancyIds = new Set<string>();
  const introducedC2mCoachIds = new Set<string>();

  if (c2cCoachIds.length > 0) {
    const { data } = await supabase.from("club2coach_shares").select("coach_listing_id").in("coach_listing_id", c2cCoachIds);
    for (const row of data ?? []) introducedCoachListingIds.add(row.coach_listing_id);
  }
  if (c2cVacancyIds.length > 0) {
    const { data } = await supabase.from("club2coach_shares").select("club_vacancy_id").in("club_vacancy_id", c2cVacancyIds);
    for (const row of data ?? []) introducedVacancyIds.add(row.club_vacancy_id);
  }
  if (c2mCoachIds.length > 0) {
    const { data } = await supabase
      .from("coach2mentor_requests")
      .select("coach_listing_id")
      .in("coach_listing_id", c2mCoachIds)
      .eq("status", "accepted");
    for (const row of data ?? []) introducedC2mCoachIds.add(row.coach_listing_id);
  }

  function alreadyIntroduced(c: Candidate): boolean {
    if (c.table === "club2coach_coach_listings") return introducedCoachListingIds.has(c.id);
    if (c.table === "club2coach_club_vacancies") return introducedVacancyIds.has(c.id);
    return introducedC2mCoachIds.has(c.id);
  }

  const comingUp: Candidate[] = [];
  const arrived: Candidate[] = [];

  for (const c of candidates) {
    if (alreadyIntroduced(c)) continue;

    const paidAt = new Date(c.paid_at);
    // 120 days for everyone: from payment (clubs) or from Activate (coaches).
    const deadline = new Date(paidAt.getTime() + 120 * 24 * 60 * 60 * 1000);
    const warnAt = new Date(deadline.getTime() - WARNING_DAYS_BEFORE * 24 * 60 * 60 * 1000);

    if (now >= deadline && !c.refund_window_notified_at) {
      arrived.push(c);
    } else if (now >= warnAt && now < deadline && !c.refund_reminder_sent_at) {
      comingUp.push(c);
    }
  }

  // Send at most one digest email covering both lists, then mark each
  // listing as notified so tomorrow's run doesn't repeat it.
  if (comingUp.length > 0 || arrived.length > 0) {
    const lines: string[] = [];
    if (comingUp.length > 0) {
      lines.push("REFUND WINDOW OPENING IN ~2 WEEKS (no introduction made yet):");
      for (const c of comingUp) {
        lines.push(`- ${c.label} — paid ${c.paid_at.slice(0, 10)}, $${c.price_aud ?? "?"} AUD, listing id ${c.id}`);
      }
      lines.push("");
    }
    if (arrived.length > 0) {
      lines.push("REFUND WINDOW REACHED (120 days from payment; club can now request a refund):");
      for (const c of arrived) {
        lines.push(`- ${c.label} — paid ${c.paid_at.slice(0, 10)}, $${c.price_aud ?? "?"} AUD, listing id ${c.id}`);
      }
    }

    await sendAdminEmail(
      `Refund window reminder (${comingUp.length + arrived.length})`,
      lines.join("\n")
    );

    for (const c of comingUp) {
      await supabase.from(c.table).update({ refund_reminder_sent_at: now.toISOString() }).eq("id", c.id);
    }
    for (const c of arrived) {
      await supabase.from(c.table).update({ refund_window_notified_at: now.toISOString() }).eq("id", c.id);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: candidates.length,
    comingUp: comingUp.length,
    arrived: arrived.length,
  });
}
