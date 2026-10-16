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
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/server/sendEmail";
import { fetchAll } from "@/lib/fetchAll";
import { INVITE_SUBJECT, firstNameOf, inviteCounts, inviteText, parseCsv, sendInviteBatch } from "@/lib/server/invitations";

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
  const body = (await req.json().catch(() => ({}))) as { action?: string; csv?: string; count?: number; email?: string; on?: boolean };
  const service = createServiceClient();

  if (body.action === "import") {
    const rows = parseCsv(body.csv ?? "");
    const header = (rows.shift() ?? []).map((h) => h.trim().toLowerCase());
    const ni = header.indexOf("ticket_name");
    const ei = header.indexOf("email_address");
    if (ei < 0) return NextResponse.json({ ok: false, error: "The CSV needs an email_address column." }, { status: 400 });
    const names = new Map<string, string[]>();
    for (const r of rows) {
      const e = (r[ei] ?? "").trim().toLowerCase();
      if (!e) continue;
      names.set(e, [...(names.get(e) ?? []), ni >= 0 ? (r[ni] ?? "").trim() : ""]);
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
    const toAdd: { email: string; first_name: string }[] = [];
    for (const [e, ns] of Array.from(names.entries())) {
      if (!valid.test(e)) { out.invalid++; continue; }
      if (e.endsWith("@footballvictoria.com.au")) { out.footballVictoria++; continue; }
      if (skipPeople.has(e)) { out.alreadySignedUp++; continue; }
      if (skipHave.has(e)) { out.alreadyListed++; continue; }
      toAdd.push({ email: e, first_name: ns.length === 1 ? firstNameOf(ns[0]) : "" });
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
    const ok = await sendEmail({ to: auth.email, subject: `TEST: ${INVITE_SUBJECT}`, text: inviteText("Aaron") });
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
    const { error } = await service
      .from("invite_recipients")
      .upsert({ email: e, status: "optout" }, { onConflict: "email" });
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, ...(await counts()) });
  }

  if (body.action === "auto") {
    const on = body.on === true;
    const { error } = await service.from("platform_settings").update({ invite_auto_send: on }).not("id", "is", null);
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, ...(await counts()) });
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
