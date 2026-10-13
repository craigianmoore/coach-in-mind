// POST /api/stripe/checkout-bulk
// One Stripe Checkout Session that pays for several of a club's unpaid vacancy adverts at once.
// Same security design as /api/stripe/checkout: the browser sends only WHICH adverts; the price
// is always looked up server-side, and every advert must belong to the signed-in club.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { CLUB2COACH_CLUB_PACKAGES, CLUB_PACK_SIZE } from "@/lib/constants";

const MAX_ADVERTS = 10;

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const ids = Array.isArray(body.listingIds) ? Array.from(new Set(body.listingIds.map(String))) : [];
  if (ids.length < 2 || ids.length > MAX_ADVERTS) {
    return NextResponse.json({ error: `Choose between 2 and ${MAX_ADVERTS} adverts to pay for together.` }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: settings, error: settingsError } = await supabase.from("platform_settings").select("stripe_payments_enabled").maybeSingle();
  if (settingsError) return NextResponse.json({ error: "Card payments are temporarily unavailable. Please try again shortly." }, { status: 503 });
  if (settings?.stripe_payments_enabled === false) {
    return NextResponse.json({ error: "Card payments are currently unavailable. Please contact Coach In Mind." }, { status: 503 });
  }

  const { data: me } = await supabase.from("people").select("id").eq("user_id", user.id).maybeSingle();
  if (!me) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { data: rows, error } = await supabase
    .from("club2coach_club_vacancies")
    .select("id, person_id, paid, status, deleted_at")
    .in("id", ids);
  if (error || !rows || rows.length !== ids.length) {
    return NextResponse.json({ error: "One of those adverts wasn't found." }, { status: 403 });
  }
  for (const r of rows) {
    if (r.person_id !== me.id) return NextResponse.json({ error: "One of those adverts wasn't found." }, { status: 403 });
    if (r.deleted_at || r.status === "superseded" || r.status === "filled" || r.status === "expired") {
      return NextResponse.json({ error: "One of those adverts has ended, so it can't be paid for. Refresh the page and try again." }, { status: 409 });
    }
    if (r.paid && r.status !== "refunded") {
      return NextResponse.json({ error: "One of those adverts is already paid for. Refresh the page and try again." }, { status: 409 });
    }
  }

  const price = CLUB2COACH_CLUB_PACKAGES[CLUB_PACK_SIZE];
  if (price == null) return NextResponse.json({ error: "Package not available." }, { status: 400 });

  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "https://www.coachinmind.com.au";
  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      payment_intent_data: { receipt_email: user.email ?? undefined },
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: Math.round(price * 100),
            product_data: { name: `Club2Coach vacancy — ${CLUB_PACK_SIZE} coach introductions per advert` },
          },
          quantity: ids.length,
        },
      ],
      metadata: {
        bulk: "1",
        listingIds: ids.join(","),
        packageSize: String(CLUB_PACK_SIZE),
        product: "club2coach",
        role: "club",
        personId: me.id,
      },
      success_url: `${origin}/club2coach/club?paid=1`,
      cancel_url: `${origin}/club2coach/club?paid=0`,
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("stripe bulk checkout create failed", err);
    return NextResponse.json({ error: "We couldn't start the payment. Please try again in a moment." }, { status: 502 });
  }
}
