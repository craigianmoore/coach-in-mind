// Admin-only tool for the one-off coach invitation mail-out (master admin session required).
//   GET                                   -> counts
//   POST { action: "import", csv }        -> load a list (ticket_name,email_address), skipping duplicates,
//                                            Football Victoria staff, people already signed up, and anyone already listed
//   POST { action: "test" }               -> send the invitation to the signed-in admin only
//   POST { action: "send", count }        -> send to the next `count` pending people (capped; daily ceiling applies)
//   POST { action: "auto", on }           -> switch automatic sending on or off
//   POST { action: "list" }               -> everyone on the list (for the No thanks list)
//   POST { action: "restore", email }     -> undo a "no thanks"
//   POST { action: "optout", email }      -> mark someone as "no thanks" so they are never emailed
//   POST { action: "reminders", on }      -> switch the one-off reminder to non-responders on or off
//   POST { action: "daily_limit", limit } -> emails allowed per rolling 24 hours (all kinds together)
//   POST { action: "reminder_test" }      -> send the reminder to the signed-in admin only
//   POST { action: "club_test" }          -> send the club invitation to the signed-in admin only
//   POST { action: "club_settings", enabled, share, regions } -> club invitations on/off, % of each day, regions
//   POST { action: "club_list" }          -> Victorian clubs with their region and invite status (for a CSV to fill in)
//   POST { action: "club_regions_import", csv } -> set each club's region from a CSV (club, region)
//   POST { action: "clear_pending" }      -> remove everyone NOT yet emailed (status pending, no reminder sent); sent, failed and "no thanks" people stay
//   POST { action: "club_optout", email } -> never email this club contact
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/server/sendEmail";
import { fetchAll } from "@/lib/fetchAll";
import {
  CLUB_INVITE_SUBJECT,
  INVITE_SUBJECT,
  REMINDER_SUBJECT,
  clubInviteText,
  firstNameOf,
  inviteCounts,
  inviteText,
  OPTOUT_SUBJECT,
  optoutConfirmText,
  normaliseState,
  parseCsv,
  reminderText,
  sendInviteBatch,
} from "@/lib/server/invitations";
import { REGIONS_BY_STATE } from "@/lib/constants";

export const maxDuration = 60;

async function requireMaster() {
  const supabase = await createClient();
  const { data: isMaster } = await supabase.rpc("am_i_master_admin");
  if (isMaster !== true) return { error: NextResponse.json({ ok: false, error: "Master admin session required." }, { status: 403 }) };
  const { data } = await supabase.auth.getUser();
  return { email: data.user?.email ?? null };
}

async function counts() {
  return inviteCounts(createServiceClient());
}

export async function GET() {
  const auth = await requireMaster();
  if ("error" in auth) return auth.error;
  return NextResponse.json({ ok: true, ...(await counts()) });
}

export async function POST(req: Request) {
  const auth = await requireMaster();
  if ("error" in auth) return auth.error;
  const body = (await req.json().catch(() => ({}))) as {
    action?: string;
    csv?: string;
    count?: number;
    email?: string;
    on?: boolean;
    limit?: number;
    enabled?: boolean;
    share?: number;
    regions?: string[];
  };
  const service = createServiceClient();

  if (body.action === "import") {
    const rows = parseCsv(body.csv ?? "");
    const header = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
    const ni = header.indexOf("ticket_name");
    const ei = header.indexOf("email_address");
    const si = header.indexOf("state"); // optional: VIC, TAS, NSW... (code or name)
    if (ei < 0) return NextResponse.json({ ok: false, error: "The CSV needs an email_address column." }, { status: 400 });
    const names = new Map<string, string[]>();
    const states = new Map<string, string | null>();
    for (const r of rows) {
      const e = (r[ei] ?? "").trim().toLowerCase();
      if (!e) continue;
      names.set(e, [...(names.get(e) ?? []), ni >= 0 ? (r[ni] ?? "").trim() : ""]);
      if (si >= 0 && !states.get(e)) states.set(e, normaliseState(r[si]));
    }
    const valid = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
    // Paged: a plain select silently stops at 1000 rows, which would let duplicates slip past these checks.
    const [ppl, have] = await Promise.all([
      fetchAll<{ email: string | null }>((a, b) => service.from("people").select("email").order("id").range(a, b)),
      fetchAll<{ email: string }>((a, b) => service.from("invite_recipients").select("email").order("email").range(a, b)),
    ]);
    const skipPeople = new Set((ppl ?? []).map((p) => (p.email ?? "").toLowerCase()));
    const skipHave = new Set((have ?? []).map((p) => p.email));
    const out = { added: 0, invalid: 0, footballVictoria: 0, alreadySignedUp: 0, alreadyListed: 0 };
    const toAdd: { email: string; first_name: string; state: string | null }[] = [];
    for (const [e, ns] of Array.from(names.entries())) {
      if (!valid.test(e)) { out.invalid++; continue; }
      if (e.endsWith("@footballvictoria.com.au")) { out.footballVictoria++; continue; }
      if (skipPeople.has(e)) { out.alreadySignedUp++; continue; }
      if (skipHave.has(e)) { out.alreadyListed++; continue; }
      toAdd.push({ email: e, first_name: ns.length === 1 ? firstNameOf(ns[0]) : "", state: states.get(e) ?? null });
    }
    for (let i = 0; i < toAdd.length; i += 100) {
      const { error } = await service.from("invite_recipients").insert(toAdd.slice(i, i + 100));
      if (error) return NextResponse.json({ ok: false, error: error.message, ...out }, { status: 500 });
      out.added += Math.min(100, toAdd.length - i);
    }
    return NextResponse.json({ ok: true, ...out, ...(await counts()) });
  }

  if (body.action === "test") {
    if (!auth.email) return NextResponse.json({ ok: false, error: "No admin email on this session." }, { status: 400 });
    const ok = await sendEmail({ to: auth.email, subject: `TEST: ${INVITE_SUBJECT}`, text: inviteText("Aaron", "VIC") });
    return NextResponse.json({ ok, to: auth.email });
  }

  if (body.action === "list") {
    const data = await fetchAll<{ email: string; first_name: string | null; status: string; sent_at: string | null }>((a, b) =>
      service.from("invite_recipients").select("email, first_name, status, sent_at").order("email", { ascending: true }).range(a, b)
    );
    return NextResponse.json({ ok: true, rows: data });
  }

  if (body.action === "restore") {
    const e = (body.email ?? "").trim().toLowerCase();
    const { data: row } = await service.from("invite_recipients").select("sent_at").eq("email", e).maybeSingle();
    if (!row) return NextResponse.json({ ok: false, error: "Not on the list." }, { status: 404 });
    const { error } = await service
      .from("invite_recipients")
      .update({ status: row.sent_at ? "sent" : "pending" })
      .eq("email", e)
      .eq("status", "optout");
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, ...(await counts()) });
  }

  if (body.action === "optout") {
    const e = (body.email ?? "").trim().toLowerCase();
    if (!e) return NextResponse.json({ ok: false, error: "Missing email." }, { status: 400 });
    const { data: before } = await service.from("invite_recipients").select("status").eq("email", e).maybeSingle();
    const { error } = await service
      .from("invite_recipients")
      .upsert({ email: e, status: "optout" }, { onConflict: "email" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    // Confirm once, and never if they were already opted out.
    const confirmed = before?.status === "optout" ? false : await sendEmail({ to: e, subject: OPTOUT_SUBJECT, text: optoutConfirmText("coach") });
    return NextResponse.json({ ok: true, confirmationSent: confirmed, ...(await counts()) });
  }

  if (body.action === "clear_pending") {
    // Only people who have never been emailed. Sent / failed / sending / no-thanks rows are kept on purpose,
    // so removing and re-importing a list can never cause anyone to be invited twice.
    const st = await service.from("platform_settings").select("invite_auto_send").limit(1).maybeSingle();
    if (st.data?.invite_auto_send === true) {
      return NextResponse.json({ ok: false, error: "Switch automatic sending off first, so nobody is emailed while the list is being changed." }, { status: 400 });
    }
    const { data, error } = await service
      .from("invite_recipients")
      .delete()
      .eq("status", "pending")
      .is("sent_at", null)
      .is("reminder_sent_at", null)
      .select("email");
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, removed: (data ?? []).length, ...(await counts()) });
  }

  if (body.action === "auto") {
    const on = body.on === true;
    const { error } = await service.from("platform_settings").update({ invite_auto_send: on }).not("id", "is", null);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, ...(await counts()) });
  }

  if (body.action === "reminders") {
    const { error } = await service.from("platform_settings").update({ reminders_enabled: body.on === true }).not("id", "is", null);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, ...(await counts()) });
  }

  if (body.action === "daily_limit") {
    const limit = Math.floor(Number(body.limit));
    if (!Number.isFinite(limit) || limit < 9 || limit > 1000) {
      return NextResponse.json({ ok: false, error: "Enter a number between 9 and 1000." }, { status: 400 });
    }
    const { error } = await service.from("platform_settings").update({ invite_daily_limit: limit }).not("id", "is", null);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, ...(await counts()) });
  }

  if (body.action === "reminder_test") {
    if (!auth.email) return NextResponse.json({ ok: false, error: "No admin email on this session." }, { status: 400 });
    const ok = await sendEmail({ to: auth.email, subject: `TEST: ${REMINDER_SUBJECT}`, text: reminderText("Aaron", "VIC") });
    return NextResponse.json({ ok, to: auth.email });
  }

  if (body.action === "club_test") {
    if (!auth.email) return NextResponse.json({ ok: false, error: "No admin email on this session." }, { status: 400 });
    const ok = await sendEmail({ to: auth.email, subject: `TEST: ${CLUB_INVITE_SUBJECT}`, text: clubInviteText("Example Football Club", "VIC") });
    return NextResponse.json({ ok, to: auth.email });
  }

  if (body.action === "club_settings") {
    const share = Math.floor(Number(body.share));
    if (!Number.isFinite(share) || share < 0 || share > 100) {
      return NextResponse.json({ ok: false, error: "The share must be between 0 and 100." }, { status: 400 });
    }
    const valid = new Set(REGIONS_BY_STATE.VIC as readonly string[]);
    const regions = Array.from(new Set((body.regions ?? []).filter((r) => valid.has(r))));
    const { error } = await service
      .from("platform_settings")
      .update({ club_invite_enabled: body.enabled === true, club_invite_share: share, club_invite_regions: regions })
      .not("id", "is", null);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, ...(await counts()) });
  }

  if (body.action === "club_list") {
    const rows = await fetchAll<{ club_id: string; email: string; do_not_contact: boolean; contacted_at: string | null; invite_sent_at: string | null; clubs: { name: string; region: string | null } | { name: string; region: string | null }[] }>((a, b) =>
      service
        .from("club_contacts")
        .select("club_id, email, do_not_contact, contacted_at, invite_sent_at, clubs!inner(name, state, region)")
        .eq("clubs.state", "VIC")
        .order("club_id")
        .range(a, b)
    );
    const out = rows.map((r) => {
      const c = Array.isArray(r.clubs) ? r.clubs[0] : r.clubs;
      return { club: c?.name ?? "", region: c?.region ?? "", email: r.email, status: r.do_not_contact ? "do not contact" : r.invite_sent_at ? "invited" : r.contacted_at ? "contacted" : "not yet" };
    });
    return NextResponse.json({ ok: true, rows: out });
  }

  if (body.action === "club_regions_import") {
    const rows = parseCsv(body.csv ?? "");
    const header = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
    const ci = header.indexOf("club");
    const ri = header.indexOf("region");
    if (ci < 0 || ri < 0) return NextResponse.json({ ok: false, error: "The CSV needs club and region columns." }, { status: 400 });
    const canonical = new Map((REGIONS_BY_STATE.VIC as readonly string[]).map((r) => [r.toLowerCase(), r]));
    const clubs = await fetchAll<{ id: string; name: string; state: string }>((a, b) =>
      service.from("clubs").select("id, name, state").eq("state", "VIC").order("id").range(a, b)
    );
    const byName = new Map(clubs.map((c) => [c.name.trim().toLowerCase(), c]));
    const out = { updated: 0, blank: 0, unknownRegion: 0, unknownClub: 0 };
    const toSet: { id: string; name: string; state: string; region: string }[] = [];
    for (const r of rows) {
      const name = (r[ci] ?? "").trim().toLowerCase();
      const regionRaw = (r[ri] ?? "").trim();
      if (!name) continue;
      if (!regionRaw) { out.blank++; continue; }
      const region = canonical.get(regionRaw.toLowerCase());
      if (!region) { out.unknownRegion++; continue; }
      const club = byName.get(name);
      if (!club) { out.unknownClub++; continue; }
      toSet.push({ id: club.id, name: club.name, state: club.state, region });
    }
    for (let i = 0; i < toSet.length; i += 100) {
      const { error } = await service.from("clubs").upsert(toSet.slice(i, i + 100), { onConflict: "id" });
      if (error) return NextResponse.json({ ok: false, error: error.message, ...out }, { status: 500 });
      out.updated += Math.min(100, toSet.length - i);
    }
    return NextResponse.json({ ok: true, ...out, ...(await counts()) });
  }

  if (body.action === "club_optout") {
    const e = (body.email ?? "").trim().toLowerCase();
    if (!e) return NextResponse.json({ ok: false, error: "Missing email." }, { status: 400 });
    const { data: before } = await service.from("club_contacts").select("club_id, do_not_contact").ilike("email", e);
    const { data, error } = await service.from("club_contacts").update({ do_not_contact: true }).ilike("email", e).select("club_id");
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!data || data.length === 0) return NextResponse.json({ ok: false, error: "No club contact has that email." }, { status: 404 });
    // Confirm once, and never if they were already marked do-not-contact.
    const already = (before ?? []).length > 0 && (before ?? []).every((b) => b.do_not_contact);
    const confirmed = already ? false : await sendEmail({ to: e, subject: OPTOUT_SUBJECT, text: optoutConfirmText("club") });
    return NextResponse.json({ ok: true, confirmationSent: confirmed, ...(await counts()) });
  }

  if (body.action === "send") {
    const want = Math.max(1, Math.min(50, Math.floor(Number(body.count) || 0)));
    const r = await sendInviteBatch(service, want);
    if (r.atCeiling) {
      return NextResponse.json({ ok: false, error: `Daily ceiling reached (${r.counts.sentLast24h} sent in the last 24 hours, ceiling ${r.counts.dailyCap}). Try again later.`, ...r.counts }, { status: 429 });
    }
    return NextResponse.json({ ok: true, sentNow: r.sent, failedNow: r.failed, paused: r.paused, cappedByDailyCeiling: r.cappedByDailyCeiling, ...r.counts });
  }

  return NextResponse.json({ ok: false, error: "Unknown action." }, { status: 400 });
}
