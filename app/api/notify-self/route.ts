import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APP_URL, sendEmail } from "@/lib/server/sendEmail";
import { isRateLimited } from "@/lib/server/rateLimit";

// Confirmation email to the signed-in user, at THEIR OWN address only
// (read from their own people row — the client never supplies a recipient).
const TEMPLATES: Record<string, { subject: string; body: (d: string) => string }> = {
  // Generic welcome (we don't know which role they came for).
  signup: {
    subject: "Welcome to Coach In Mind",
    body: () =>
      `Thanks for signing up. Your account is ready — sign in any time to let clubs know you are looking for a role, or to advertise a coaching role for your club:\n${APP_URL}`,
  },
  // Role-specific welcomes, chosen from the page the person signed up from.
  signup_coach: {
    subject: "Welcome — now let clubs know you're looking",
    body: () =>
      `Thanks for signing up. Your account is ready — sign in any time to let clubs know you are looking for a role:\n${APP_URL}/club2coach/coach`,
  },
  signup_club: {
    subject: "Welcome — now advertise your coaching role",
    body: () =>
      `Thanks for signing up. Your account is ready — sign in any time to advertise a coaching role for your club:\n${APP_URL}/club2coach/club`,
  },
  signup_mentor: {
    subject: "Welcome — now set up your mentor profile",
    body: () =>
      `Thanks for signing up. Your account is ready — sign in any time to set up your mentor profile:\n${APP_URL}/coach2mentor/mentor`,
  },
  coach_listing: {
    subject: "Your coaching listing is saved — one step left to activate it",
    body: (d) =>
      `We've received your submission for a coaching role${d ? ` (${d})` : ""}, and it's saved.\n\nIt isn't in matching yet. If you have a credit in your balance (your free founding credit is added automatically while founding spots last), press Activate; otherwise buy a credit first, then press Activate on your listing page — your listing is then in matching for 30 days from that day (up to 5 club introductions in that time):\n${APP_URL}/club2coach/coach\n\nOnce you've activated it we'll start matching you with clubs, and email you when you've been matched.`,
  },
  vacancy: {
    subject: "Your coaching vacancy is saved — one step left to activate it",
    body: (d) =>
      `We've received your vacancy${d ? ` (${d})` : ""}, and it's saved.\n\nIt isn't active yet: your vacancy is only included in matching once payment is confirmed. You can pay by card (or use any free introduction credit) from your vacancy page:\n${APP_URL}/club2coach/club\n\nAs soon as it's active we'll start matching coaches to it, and email you when you've been matched.`,
  },
  coach_profile: {
    subject: "Your Coach 2 Mentor profile is saved — one step left to activate it",
    body: () =>
      `We've received your Coach 2 Mentor profile, and it's saved.\n\nIt isn't in matching yet. If you have a credit in your balance (your free founding credit is added automatically while founding spots last), press Activate; otherwise buy a credit first, then press Activate on your profile page — your profile is then in matching for 60 days from that day:\n${APP_URL}/coach2mentor/coach\n\nOnce you've activated it we'll start matching you with mentors, and email you when you've been matched.`,
  },
  mentor_profile: {
    subject: "Your mentor profile is saved — we're verifying it",
    body: () =>
      `We've received your mentor profile, and it's saved.\n\nBefore any mentor goes live we check their accreditation evidence, so coaches can trust who they're introduced to. This usually takes 1–2 business days, and we'll email you as soon as you're verified. You can then choose your mentee places and pay by card from your mentor page (you can edit your profile there at any time):\n${APP_URL}/coach2mentor/mentor\n\nOnce your places are confirmed we'll start matching coaches to you, and email you when you've been matched.`,
  },
};

export async function POST(req: Request) {
  const { type, detail } = await req.json().catch(() => ({}));
  const tpl = typeof type === "string" ? TEMPLATES[type] : undefined;
  if (!tpl) return NextResponse.json({ ok: false, error: "Unknown type" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  if (await isRateLimited(supabase, "notify-self", 20, 3600)) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  const { data: person } = await supabase.from("people").select("full_name,email").eq("user_id", user.id).maybeSingle();
  if (!person?.email) return NextResponse.json({ ok: false, error: "No email on file" }, { status: 200 });

  const first = person.full_name?.trim().split(/\s+/)[0] || "there";
  const d = typeof detail === "string" ? detail.slice(0, 200) : "";
  const ok = await sendEmail({ to: person.email, subject: tpl.subject, text: `Hi ${first},\n\n${tpl.body(d)}` });
  return NextResponse.json({ ok });
}
