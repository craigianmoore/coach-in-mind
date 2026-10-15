import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendAdminEmail } from "@/lib/server/sendAdminEmail";
import { runInviteTopUp } from "@/lib/server/invitations";

// Runs at :30 every hour; only acts at 4:30pm Melbourne (see runInviteTopUp).
export const maxDuration = 60;

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    await runInviteTopUp(createServiceClient(), sendAdminEmail);
  } catch (err) {
    console.error("cron invite-topup failed", err);
  }
  return NextResponse.json({ ok: true });
}
