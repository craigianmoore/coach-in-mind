// Retries emails Resend refused earlier (daily quota, rate limit, outage), oldest first. Runs at the
// start of every hourly cron, before anything new is sent, so missed emails go out first thing
// when Resend next allows. Stops at the first temporary refusal (the quota is still out).
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmailDetailed } from "./sendEmail";
import { sendAdminEmail } from "./sendAdminEmail";

const MAX_AGE_MS = 3 * 24 * 3600_000; // after 3 days an old notice is more confusing than useful
const MAX_ATTEMPTS = 12;

export async function retryQueuedEmails(service: SupabaseClient, max = 25) {
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  // Anything queued for longer than the limit is given up on (and stays listed for the admin).
  await service
    .from("email_failures")
    .update({ status: "gave_up", resolved_at: nowIso })
    .eq("status", "queued")
    .not("body", "is", null)
    .lt("created_at", new Date(now - MAX_AGE_MS).toISOString());

  const stale = new Date(now - 15 * 60_000).toISOString(); // a run that died mid-send
  const { data: rows } = await service
    .from("email_failures")
    .select("id, to_email, subject, body, reply_to, kind, attempts")
    .or(`status.eq.queued,and(status.eq.retrying,last_attempt_at.lt.${stale})`)
    .not("body", "is", null)
    .order("created_at", { ascending: true })
    .limit(max);

  let sent = 0;
  let stillQueued = 0;
  for (const r of rows ?? []) {
    const { data: claimed } = await service
      .from("email_failures")
      .update({ status: "retrying", last_attempt_at: new Date().toISOString() })
      .eq("id", r.id)
      .in("status", ["queued", "retrying"])
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    const res =
      r.kind === "admin"
        ? await sendAdminEmail(r.subject, r.body, { record: false, rawSubject: true, replyTo: r.reply_to ?? undefined })
        : await sendEmailDetailed({ to: r.to_email, subject: r.subject, text: r.body }, { record: false });
    const attempts = (r.attempts ?? 0) + 1;
    if (res.ok) {
      sent++;
      await service.from("email_failures").update({ status: "sent", attempts, resolved_at: new Date().toISOString() }).eq("id", r.id);
    } else if (res.transient) {
      stillQueued++;
      await service
        .from("email_failures")
        .update({ status: attempts >= MAX_ATTEMPTS ? "gave_up" : "queued", attempts, ...(attempts >= MAX_ATTEMPTS ? { resolved_at: new Date().toISOString() } : {}) })
        .eq("id", r.id);
      break; // the quota is still out; try again next hour
    } else {
      await service.from("email_failures").update({ status: "permanent", attempts, resolved_at: new Date().toISOString() }).eq("id", r.id);
    }
    await new Promise((res2) => setTimeout(res2, 600));
  }
  return { sent, stillQueued };
}
