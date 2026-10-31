// The one-off coach invitation email, and helpers for the admin send tool.
export const INVITE_SUBJECT = "Have you found a coaching role for next season?";

// Default for how many emails (invitations, reminders and club invitations together) may go out in any rolling 24
// hours. The admin can change it on the Invites tab (platform_settings.invite_daily_limit). Sending is spread across
// the working day in small hourly batches, never all at once.
export const DEFAULT_DAILY_LIMIT = 150;
export const SEND_HOURS_PER_DAY = 9; // the hourly runs between 9am and 5pm Melbourne time
export const REMINDER_AFTER_DAYS = 4; // a reminder goes only to people who were invited at least this long ago
export const CLUB_INVITE_STATES = ["VIC"]; // club invitations are Victoria-only for now

// How each state reads in "as a ___ football coach". Unknown or blank falls back to plain "football coach",
// so nobody is ever told they are from a state they are not.
const STATE_ADJECTIVE: Record<string, string> = {
  VIC: "Victorian",
  TAS: "Tasmanian",
  NSW: "New South Wales",
  NNSW: "Northern NSW",
  QLD: "Queensland",
  SA: "South Australian",
  WA: "Western Australian",
  ACT: "ACT",
  NT: "Northern Territory",
};

// Accepts a code (TAS) or a name (Tasmania, Tasmanian); returns the code, or null if not recognised.
export function normaliseState(v?: string | null): string | null {
  const t = (v ?? "").trim().toLowerCase();
  if (!t) return null;
  const aliases: Record<string, string> = {
    vic: "VIC", victoria: "VIC", victorian: "VIC",
    tas: "TAS", tasmania: "TAS", tasmanian: "TAS",
    nsw: "NSW", "new south wales": "NSW",
    nnsw: "NNSW", "northern nsw": "NNSW",
    qld: "QLD", queensland: "QLD",
    sa: "SA", "south australia": "SA", "south australian": "SA",
    wa: "WA", "western australia": "WA", "western australian": "WA",
    act: "ACT", "australian capital territory": "ACT",
    nt: "NT", "northern territory": "NT",
  };
  return aliases[t] ?? null;
}

export function inviteText(first: string, state?: string | null) {
  const hi = first ? `Hi ${first},` : "Hi there,";
  const adj = STATE_ADJECTIVE[state ?? ""];
  const who = adj ? `a ${adj} football coach` : "a football coach";
  return `${hi}

You’re receiving this one-off invitation because, as ${who}, you may be interested to hear about football coaching opportunities.

Have you found a coaching role for next season, or are you still looking?

If you're still looking, you're not alone. Finding your next club often comes down to chance: word of mouth, a post in a group, or applying and hoping. Finding a club shouldn't be a lottery. Skip the guesswork. Get introduced to a club that suits you.

Coach In Mind matches on fit instead. You tell us what you're looking for (role, age group, ability, competition level and area), clubs tell us what they need, and we match the two. If you're after a Ford, we won't send you to a Toyota showroom.

Many of the best coaches had a mentor along the way. If you're not ready for one, that's fine. If you think you are, sign up and we'll connect you with one.

Founding coaches get a free credit while places last. Signing up and completing your profile doesn't start the clock or touch your credit; that only happens when you choose to activate.

Sign up here: https://www.coachinmind.com.au/signup

Our one-page flyer: https://www.coachinmind.com.au/coach-in-mind-flyer.pdf

This isn't a regular newsletter. If you'd rather not hear from us again, just reply "no thanks" and we'll remove you.`;
}

// Minimal CSV parser (handles quoted fields).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

export function firstNameOf(full: string) {
  const f = full.trim().split(/\s+/)[0] ?? "";
  if (!f) return "";
  return f === f.toLowerCase() || f === f.toUpperCase() ? f.charAt(0).toUpperCase() + f.slice(1).toLowerCase() : f;
}

// ---- "No thanks" confirmation (sent once, when an admin records someone's no thanks) ----
export const OPTOUT_SUBJECT = "You're off our list";
export function optoutConfirmText(kind: "coach" | "club") {
  const wish = kind === "club" ? "We wish you and your club all the best for the season ahead." : "We wish you all the best for the season ahead.";
  return `Hi there,

Thanks for letting us know. We've taken you off our list, so you won't hear from us again.

${wish} You know where we are if you change your mind.`;
}

// ---- Reminder and club emails ----
export const REMINDER_SUBJECT = "Still looking for a coaching position?";

// Sent once only, to people invited a few days earlier who have not signed up and have not said no thanks.
export function reminderText(first: string, state?: string | null) {
  const hi = first ? `Hi ${first},` : "Hi there,";
  return `${hi}

Just a quick follow-up to our note a few days ago, in case it got buried.

Are you still looking for a coaching position for next season? If so, finding a club shouldn't be a lottery. Skip the guesswork. Get introduced to a club that suits you.

You tell us what you're looking for (role, age group, ability, competition level and area), clubs tell us what they need, and we match the two. If you're after a Ford, we won't send you to a Toyota showroom.

Many of the best coaches had a mentor along the way. If you're not ready for one, that's fine. If you think you are, we can connect you with one.

Founding coaches get a free credit while places last, and completing your profile doesn't touch it.

Sign up here: https://www.coachinmind.com.au/signup

This is the only reminder we'll send. If you'd rather not hear from us again, just reply "no thanks" and we'll remove you.`;
}

export const CLUB_INVITE_SUBJECT = "Have you filled all your coaching roles?";

// Written in the "we" voice, signed by the standard Coach In Mind footer. Deliberately no mention of any
// governing body or Football Victoria.
export function clubInviteText(clubName: string, state?: string | null) {
  const adj = STATE_ADJECTIVE[state ?? ""];
  const what = adj ? `a ${adj} football club` : "a football club";
  const club = clubName.trim() ? `${clubName.trim()} is ${what}` : `you run ${what}`;
  return `Hi there,

You're receiving this one-off note because ${club}, and clubs often need to find coaches.

Have you filled all your coaching roles for next season?

If not, you're not alone. Most clubs find coaches through word of mouth, a social media post, or whoever puts their hand up, and it's hit and miss. Hiring a coach shouldn't be a lottery. Skip the guesswork. Get introduced to a coach who suits your club.

Coach In Mind matches on fit instead. You tell us the role, age group, ability, competition level and area, coaches tell us what they're looking for, and we match the two. If you're after a Ford, we won't send you to a Toyota showroom.

Your first introduction is free, with no obligation. Setting up your account and vacancy doesn't use it.

Advertise a vacancy here: https://www.coachinmind.com.au/signup

This isn't a regular newsletter. If you'd rather not hear from us again, just reply "no thanks" and we'll remove you.`;
}

// ---- Sending (shared by the admin tool and the hourly cron) ----
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmailDetailed } from "./sendEmail";
import { fetchAll } from "@/lib/fetchAll";

type Settings = {
  autoSend: boolean;
  dailyLimit: number;
  remindersEnabled: boolean;
  clubEnabled: boolean;
  clubShare: number;
  clubRegions: string[];
};

async function loadSettings(service: SupabaseClient): Promise<Settings> {
  const { data } = await service
    .from("platform_settings")
    .select("invite_auto_send, invite_daily_limit, reminders_enabled, club_invite_enabled, club_invite_share, club_invite_regions")
    .limit(1)
    .maybeSingle();
  const d = (data ?? {}) as Record<string, unknown>;
  return {
    autoSend: d.invite_auto_send === true,
    dailyLimit: typeof d.invite_daily_limit === "number" ? d.invite_daily_limit : DEFAULT_DAILY_LIMIT,
    remindersEnabled: d.reminders_enabled !== false,
    clubEnabled: d.club_invite_enabled === true,
    clubShare: typeof d.club_invite_share === "number" ? Math.max(0, Math.min(100, d.club_invite_share)) : 25,
    clubRegions: Array.isArray(d.club_invite_regions) ? (d.club_invite_regions as string[]) : [],
  };
}

export const perRunFor = (dailyLimit: number) => Math.max(1, Math.ceil(dailyLimit / SEND_HOURS_PER_DAY));

async function signedUpEmails(service: SupabaseClient): Promise<Set<string>> {
  const rows = await fetchAll<{ email: string | null }>((a, b) => service.from("people").select("email").order("id").range(a, b));
  return new Set(rows.map((r) => (r.email ?? "").trim().toLowerCase()));
}

type Candidate = { email: string; first_name: string | null; state: string | null };

// Invited at least REMINDER_AFTER_DAYS ago, not yet reminded, not signed up. Longest-waiting first.
// (Someone who signed up with a different email address than the one we invited can't be recognised.)
async function reminderCandidates(service: SupabaseClient): Promise<Candidate[]> {
  const cutoff = new Date(Date.now() - REMINDER_AFTER_DAYS * 86400_000).toISOString();
  const rows = await fetchAll<Candidate>((a, b) =>
    service
      .from("invite_recipients")
      .select("email, first_name, state")
      .eq("status", "sent")
      .is("reminder_sent_at", null)
      .lte("sent_at", cutoff)
      .order("sent_at", { ascending: true })
      .order("email", { ascending: true })
      .range(a, b)
  );
  if (rows.length === 0) return [];
  const signed = await signedUpEmails(service);
  return rows.filter((r) => !signed.has(r.email.trim().toLowerCase()));
}

// Victorian club contacts that can be invited now: in a region the admin has switched on, never contacted,
// not marked do-not-contact.
function eligibleClubQuery(service: SupabaseClient, select: string, opts: { head?: boolean } = {}) {
  return service
    .from("club_contacts")
    .select(select, opts.head ? { count: "exact", head: true } : undefined)
    .in("clubs.state", CLUB_INVITE_STATES)
    .eq("do_not_contact", false)
    .is("invite_sent_at", null)
    .is("contacted_at", null);
}

export async function inviteCounts(service: SupabaseClient) {
  // Counted by the database, never by reading rows back: Supabase silently returns at most 1000 rows per
  // request, which made these counts (and the 24-hour ceiling) wrong once the list passed 1000 people.
  const base = () => service.from("invite_recipients").select("*", { count: "exact", head: true });
  const count = async (build: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => {
    const { count: n } = await build(base());
    return n ?? 0;
  };
  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const cutoff = new Date(Date.now() - REMINDER_AFTER_DAYS * 86400_000).toISOString();
  const st = await loadSettings(service);

  const clubCount = async (build: (q: any) => any) => {
    const { count: n } = await build(eligibleClubQuery(service, "club_id, clubs!inner(state, region)", { head: true }));
    return n ?? 0;
  };
  const [pending, sent, failed, optout, sending, coachSentLast24h, remindersSent, remindersLast24h, remindersWaiting, due, clubsLast24h, clubsSent, clubsEligible, clubsNoRegion] =
    await Promise.all([
      count((q) => q.eq("status", "pending")),
      count((q) => q.eq("status", "sent")),
      count((q) => q.eq("status", "failed")),
      count((q) => q.eq("status", "optout")),
      count((q) => q.eq("status", "sending")),
      count((q) => q.eq("status", "sent").gt("sent_at", since)),
      count((q) => q.not("reminder_sent_at", "is", null)),
      count((q) => q.gt("reminder_sent_at", since)),
      count((q) => q.eq("status", "sent").is("reminder_sent_at", null).gt("sent_at", cutoff)),
      reminderCandidates(service),
      service.from("club_contacts").select("*", { count: "exact", head: true }).gt("invite_sent_at", since).then((r) => r.count ?? 0),
      service.from("club_contacts").select("*", { count: "exact", head: true }).not("invite_sent_at", "is", null).then((r) => r.count ?? 0),
      st.clubRegions.length ? clubCount((q) => q.in("clubs.region", st.clubRegions)) : Promise.resolve(0),
      clubCount((q) => q.is("clubs.region", null)),
    ]);
  return {
    pending,
    sent,
    failed,
    optout,
    sending,
    // Everything that has gone out in the last 24 hours counts towards the daily limit.
    sentLast24h: coachSentLast24h + remindersLast24h + clubsLast24h,
    dailyCap: st.dailyLimit,
    perRun: perRunFor(st.dailyLimit),
    autoSend: st.autoSend,
    remindersEnabled: st.remindersEnabled,
    remindersDue: due.length,
    remindersWaiting,
    remindersSent,
    reminderAfterDays: REMINDER_AFTER_DAYS,
    clubEnabled: st.clubEnabled,
    clubShare: st.clubShare,
    clubRegions: st.clubRegions,
    clubsEligible,
    clubsSent,
    clubsNoRegion,
  };
}
type Counts = Awaited<ReturnType<typeof inviteCounts>>;
type BatchResult = { sent: number; failed: number; paused: boolean };
const NONE: BatchResult = { sent: 0, failed: 0, paused: false };
const pause = () => new Promise((res) => setTimeout(res, 600)); // stay under Resend's request rate limit

// Sends to the next `want` pending people, never past the daily limit, never twice to one person.
export async function sendInviteBatch(service: SupabaseClient, want: number, opts: { ignoreRollingCap?: boolean } = {}) {
  const c = await inviteCounts(service);
  const room = opts.ignoreRollingCap ? want : c.dailyCap - c.sentLast24h;
  if (room <= 0) return { sent: 0, failed: 0, paused: false, atCeiling: true, cappedByDailyCeiling: true, counts: c };
  const n = Math.min(want, room);
  const { data: next } = await service
    .from("invite_recipients")
    .select("email, first_name, state")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .order("email", { ascending: true })
    .limit(n);
  let sent = 0;
  let failed = 0;
  let paused = false;
  for (const r of next ?? []) {
    // Claim before sending so two runs can never email the same person twice.
    const { data: claimed } = await service
      .from("invite_recipients")
      .update({ status: "sending" })
      .eq("email", r.email)
      .eq("status", "pending")
      .select("email");
    if (!claimed || claimed.length === 0) continue;
    const res = await sendEmailDetailed({ to: r.email, subject: INVITE_SUBJECT, text: inviteText(r.first_name ?? "", r.state) }, { record: false });
    if (res.ok) {
      sent++;
      await service.from("invite_recipients").update({ status: "sent", sent_at: new Date().toISOString(), error: null }).eq("email", r.email);
    } else if (res.transient) {
      // Quota, rate limit or Resend trouble: put them back in the queue and stop this run. Nobody is lost.
      paused = true;
      await service.from("invite_recipients").update({ status: "pending", error: "Paused: Resend temporarily refused, will retry" }).eq("email", r.email);
      break;
    } else {
      failed++;
      await service.from("invite_recipients").update({ status: "failed", error: "Resend refused or errored" }).eq("email", r.email);
    }
    await pause();
  }
  return { sent, failed, paused, atCeiling: false, cappedByDailyCeiling: n < want, counts: await inviteCounts(service) };
}

// One reminder to each person who was invited a few days ago and hasn't signed up. Claimed before sending, so
// nobody is reminded twice.
export async function sendReminderBatch(service: SupabaseClient, n: number): Promise<BatchResult> {
  if (n <= 0) return NONE;
  const todo = (await reminderCandidates(service)).slice(0, n);
  let sent = 0;
  let failed = 0;
  let paused = false;
  for (const r of todo) {
    const { data: claimed } = await service
      .from("invite_recipients")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("email", r.email)
      .eq("status", "sent")
      .is("reminder_sent_at", null)
      .select("email");
    if (!claimed || claimed.length === 0) continue;
    const res = await sendEmailDetailed({ to: r.email, subject: REMINDER_SUBJECT, text: reminderText(r.first_name ?? "", r.state) }, { record: false });
    if (res.ok) sent++;
    else if (res.transient) {
      paused = true;
      await service.from("invite_recipients").update({ reminder_sent_at: null }).eq("email", r.email);
      break;
    } else {
      failed++; // stays marked so it is not retried every hour
      await service.from("invite_recipients").update({ error: "Reminder failed: Resend refused or errored" }).eq("email", r.email);
    }
    await pause();
  }
  return { sent, failed, paused };
}

type ClubRow = { club_id: string; email: string; clubs: { name: string; state: string; region: string | null } };

// Invitations to Victorian clubs, only in the regions the admin has switched on.
export async function sendClubInviteBatch(service: SupabaseClient, n: number, regions: string[]): Promise<BatchResult> {
  if (n <= 0 || regions.length === 0) return NONE;
  const { data } = await eligibleClubQuery(service, "club_id, email, clubs!inner(name, state, region)")
    .in("clubs.region", regions)
    .order("club_id", { ascending: true })
    .limit(n);
  let sent = 0;
  let failed = 0;
  let paused = false;
  for (const r of ((data ?? []) as unknown as ClubRow[])) {
    const { data: claimed } = await service
      .from("club_contacts")
      .update({ invite_sent_at: new Date().toISOString() })
      .eq("club_id", r.club_id)
      .eq("do_not_contact", false)
      .is("invite_sent_at", null)
      .select("club_id");
    if (!claimed || claimed.length === 0) continue;
    const res = await sendEmailDetailed(
      { to: r.email, subject: CLUB_INVITE_SUBJECT, text: clubInviteText(r.clubs.name, r.clubs.state) },
      { record: false }
    );
    if (res.ok) {
      sent++;
      await service.from("club_contacts").update({ contacted_at: new Date().toISOString(), invite_error: null }).eq("club_id", r.club_id);
    } else if (res.transient) {
      paused = true;
      await service.from("club_contacts").update({ invite_sent_at: null }).eq("club_id", r.club_id);
      break;
    } else {
      failed++; // stays marked so it is not retried every hour
      await service.from("club_contacts").update({ invite_error: "Resend refused or errored" }).eq("club_id", r.club_id);
    }
    await pause();
  }
  return { sent, failed, paused };
}

// One scheduled batch: clubs get their share (when switched on), the rest goes to coaches (half reminders, half new
// invitations, when both are available). If a group has nobody left to send to, its unused places go to the other.
export async function sendScheduledBatch(service: SupabaseClient, want: number) {
  const c = await inviteCounts(service);
  const room = c.dailyCap - c.sentLast24h;
  if (room <= 0) return { sent: 0, failed: 0, paused: false, atCeiling: true, counts: c };
  const n = Math.min(want, room);
  let sent = 0;
  let failed = 0;
  let paused = false;
  const add = (r: BatchResult) => {
    sent += r.sent;
    failed += r.failed;
    paused = paused || r.paused;
  };
  const used = () => sent + failed;
  if (c.clubEnabled && c.clubShare > 0) add(await sendClubInviteBatch(service, Math.round((n * c.clubShare) / 100), c.clubRegions));
  // The coach share is a mix: up to half goes to reminders that are due (when switched on), the rest to new invitations.
  // Reminders used to get only what new invitations left over, which in practice was nothing.
  if (!paused && c.remindersEnabled && n - used() > 0) add(await sendReminderBatch(service, Math.ceil((n - used()) / 2)));
  if (!paused && n - used() > 0) {
    const r = await sendInviteBatch(service, n - used(), { ignoreRollingCap: true });
    add({ sent: r.sent, failed: r.failed, paused: r.paused });
  }
  if (!paused && c.remindersEnabled && n - used() > 0) add(await sendReminderBatch(service, n - used()));
  if (!paused && c.clubEnabled && n - used() > 0) add(await sendClubInviteBatch(service, n - used(), c.clubRegions));
  return { sent, failed, paused, atCeiling: false, counts: await inviteCounts(service) };
}

export function melbourneHour(d = new Date()) {
  return Number(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", hour12: false }).format(d)) % 24;
}

const workLeft = (c: Counts) =>
  c.pending + (c.remindersEnabled ? c.remindersDue : 0) + (c.clubEnabled ? c.clubsEligible : 0);
// Reminders still to become due (invited too recently) also keep automatic sending switched on.
const allDone = (c: Counts) => workLeft(c) === 0 && (!c.remindersEnabled || c.remindersWaiting === 0);

// Automatic sending: each hourly run between 9am and 5pm Melbourne sends a small batch (the daily limit spread over
// the 9 runs), emails the admin inbox a daily summary at 5pm, an alert on any failure, and switches itself off with a
// note when everything is finished. Does nothing unless the switch on the Invites tab is on.
export async function runInviteAutoSend(
  service: SupabaseClient,
  notify: (subject: string, text: string) => Promise<unknown>
) {
  const before = await inviteCounts(service);
  if (!before.autoSend) return;
  const hour = melbourneHour();
  if (hour < 9 || hour > 17) return;
  let failed = 0;
  let counts = before;
  if (workLeft(before) > 0) {
    const r = await sendScheduledBatch(service, before.perRun);
    failed = r.failed;
    counts = r.counts;
    if (r.paused) {
      await notify("Invitation sending paused", `Resend temporarily refused an email. Nobody was lost: automatic sending will retry on the next hourly run.`);
    }
    if (failed > 0) {
      await notify("Invitation sending: some emails failed", `${failed} email${failed === 1 ? "" : "s"} failed to send in the latest run. Check your Resend logs. Automatic sending is still on.`);
    }
  }
  const summary = `${counts.pending} invitations waiting, ${counts.remindersEnabled ? `${counts.remindersDue} reminders due (${counts.remindersWaiting} more not yet due), ` : ""}${counts.clubEnabled ? `${counts.clubsEligible} clubs waiting, ` : ""}${counts.failed} failed, ${counts.optout} marked no thanks.`;
  if (allDone(counts)) {
    await service.from("platform_settings").update({ invite_auto_send: false }).not("id", "is", null);
    await notify("Invitation mail-out finished", `Everything has been sent: ${counts.sent} invitations, ${counts.remindersSent} reminders and ${counts.clubsSent} club invitations in total. ${counts.failed} failed, ${counts.optout} marked no thanks. Automatic sending has switched itself off.`);
    return;
  }
  if (hour === 17) {
    await notify("Invitations: today's summary", `${counts.sentLast24h} emails sent in the last 24 hours (limit ${counts.dailyCap}). ${summary} Automatic sending continues tomorrow from 9am.`);
  }
}
