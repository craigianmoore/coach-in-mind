import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendAdminEmail } from "@/lib/server/sendAdminEmail";
import { runInviteAutoSend } from "@/lib/server/invitations";

// Runs at :30 every hour (see vercel.json); acts only between 9am and 5pm Melbourne and only while automatic
// sending is switched on. Sends a small batch of invitations, reminders and club invitations (see
// runInviteAutoSend). The path keeps its old name so the schedule in vercel.json needs no change.
export const maxDuration = 300;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    await runInviteAutoSend(createServiceClient(), sendAdminEmail);
  } catch (err) {
    console.error("cron invite-topup failed", err);
  }
  return NextResponse.json({ ok: true });
}
