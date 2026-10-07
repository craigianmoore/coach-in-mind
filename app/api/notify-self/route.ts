import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_URL, sendEmail } from "@/lib/server/sendEmail";

// Confirmation email to the signed-in user, at THEIR OWN address only
// (read from their own people row — the client never supplies a recipient).
const TEMPLATES: Record<string, { subject: string; body: (d: string) => string }> = {
  signup: {
    subject: "Welcome to Coach In Mind",
    body: () =>
      `Thanks for signing up. Your account is ready — sign in any time to create a coaching listing or advertise a vacancy:\n${APP_URL}`,
  },
  coach_listing: {
    subject: "Your coaching listing is saved — one step left to activate it",
    body: (d) =>
      `We've received your submission for a coaching role${d ? ` (${d})` : ""}, and it's saved.\n\nIt isn't in matching yet. Buy a credit (or, while founding spots last, use your free founding credit) and press Activate on your listing page — your listing is then in matching for 60 days from that day:\n${APP_URL}/club2coach/coach\n\nOnce you've activated it we'll start matching you with clubs, and email you when you've been matched.`,
  },
  vacancy: {
    subject: "Your coaching vacancy is saved — one step left to activate it",
    body: (d) =>
      `We've received your vacancy${d ? ` (${d})` : ""}, and it's saved.\n\nIt isn't active yet: your vacancy is only included in matching once payment is confirmed. You can pay by card (or use any free introduction credit) from your vacancy page:\n${APP_URL}/club2coach/club\n\nAs soon as it's active we'll start matching coaches to it, and email you when you've been matched.`,
  },
  coach_profile: {
    subject: "We've received your Coach 2 Mentor profile",
    body: () => `We've received your coach profile. You can review or edit it at any time:\n${APP_URL}/coach2mentor/coach`,
  },
  mentor_profile: {
    subject: "We've received your mentor profile",
    body: () => `We've received your mentor profile. You can review or edit it at any time:\n${APP_URL}/coach2mentor/mentor`,
  },
};

export async function POST(req: Request) {
  const { type, detail } = await req.json().catch(() => ({}));
  const tpl = typeof type === "string" ? TEMPLATES[type] : undefined;
  if (!tpl) return NextResponse.json({ ok: false, error: "Unknown type" }, { status: 400 });

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const { data: person } = await supabase.from("people").select("full_name,email").eq("user_id", user.id).maybeSingle();
  if (!person?.email) return NextResponse.json({ ok: false, error: "No email on file" }, { status: 200 });

  const first = person.full_name?.trim().split(/\s+/)[0] || "there";
  const d = typeof detail === "string" ? detail.slice(0, 200) : "";
  const ok = await sendEmail({ to: person.email, subject: tpl.subject, text: `Hi ${first},\n\n${tpl.body(d)}` });
  return NextResponse.json({ ok });
}
