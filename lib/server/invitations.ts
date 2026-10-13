// The one-off coach invitation email, and helpers for the admin send tool.
export const INVITE_SUBJECT = "An invitation to join Coach In Mind (free for the first 100 coaches)";

// Soft daily ceiling across everything Resend sends. The Free plan stops at 100 a day and the app's own
// emails (welcomes, confirmations, alerts) share it, so invitations stop at this many in any 24 hours.
// Raise it if the Resend plan is upgraded.
export const INVITE_DAILY_CAP = 85;

export function inviteText(first: string) {
  const hi = first ? `Hi ${first},` : "Hi there,";
  return `${hi}

You’re receiving this one-off invitation because, as a coach, you may be interested to hear about football coaching opportunities.

Coach In Mind connects football coaches with clubs looking for coaches, and with mentors who can help coaches develop. We're opening to coaches first and bringing clubs in shortly, so coaches who join now will be in place when clubs arrive.

The first 100 coaches get a free founding credit, so it costs nothing to try.

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

// ---- Sending (shared by the admin tool and the hourly cron) ----
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmailDetailed } from "./sendEmail";

export async function inviteCounts(service: SupabaseClient) {
  const { data } = await service.from("invite_recipients").select("status, sent_at");
  const c = { pending: 0, sent: 0, failed: 0, optout: 0, sending: 0, sentLast24h: 0 };
  const since = Date.now() - 24 * 3600_000;
  for (const r of data ?? []) {
    c[r.status as "pending" | "sent" | "failed" | "optout" | "sending"] += 1;
    if (r.status === "sent" && r.sent_at && new Date(r.sent_at).getTime() > since) c.sentLast24h += 1;
  }
  const { data: ps } = await service.from("platform_settings").select("invite_auto_send").limit(1).maybeSingle();
  return { ...c, dailyCap: INVITE_DAILY_CAP, autoSend: ps?.invite_auto_send === true };
}

// Sends to the next `want` pending people, never past the daily ceiling, never twice to one person.
export async function sendInviteBatch(service: SupabaseClient, want: number) {
  const c = await inviteCounts(service);
  const room = INVITE_DAILY_CAP - c.sentLast24h;
  if (room <= 0) return { sent: 0, failed: 0, paused: false, atCeiling: true, cappedByDailyCeiling: true, counts: c };
  const n = Math.min(want, room);
  const { data: next } = await service
    .from("invite_recipients")
    .select("email, first_name")
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
    const res = await sendEmailDetailed({ to: r.email, subject: INVITE_SUBJECT, text: inviteText(r.first_name ?? "") }, { record: false });
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
    await new Promise((res) => setTimeout(res, 600)); // stay under Resend's request rate limit
  }
  return { sent, failed, paused, atCeiling: false, cappedByDailyCeiling: n < want, counts: await inviteCounts(service) };
}

export function melbourneHour(d = new Date()) {
  return Number(new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Melbourne", hour: "numeric", hour12: false }).format(d)) % 24;
}

// Automatic sending: each hourly run between 9am and 5pm Melbourne sends up to INVITE_AUTO_PER_RUN
// (about 80 a day), emails the admin inbox a daily summary at 5pm, an alert on any failure, and switches
// itself off with a note when the list is finished. Does nothing unless the switch on the Invites tab is on.
export const INVITE_AUTO_PER_RUN = 9;
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
  if (before.pending > 0) {
    const r = await sendInviteBatch(service, INVITE_AUTO_PER_RUN);
    failed = r.failed;
    counts = r.counts;
    if (r.paused) {
      await notify("Invitation sending paused", `Resend temporarily refused an email (most likely the daily limit). Nobody was lost: ${counts.pending} are still waiting and automatic sending will retry on the next hourly run.`);
    }
    if (failed > 0) {
      await notify("Invitation sending: some emails failed", `${failed} invitation${failed === 1 ? "" : "s"} failed to send in the latest run. Check your Resend plan and logs. ${counts.pending} still waiting; automatic sending is still on.`);
    }
  }
  if (counts.pending === 0) {
    await service.from("platform_settings").update({ invite_auto_send: false }).not("id", "is", null);
    await notify("Invitation mail-out finished", `All invitations have been sent: ${counts.sent} sent in total, ${counts.failed} failed, ${counts.optout} marked no thanks. Automatic sending has switched itself off.`);
    return;
  }
  if (hour === 17) {
    await notify("Invitations: today's summary", `${counts.sentLast24h} invitations sent in the last 24 hours. ${counts.pending} still to send, ${counts.failed} failed, ${counts.optout} marked no thanks. Automatic sending continues tomorrow from 9am.`);
  }
}
