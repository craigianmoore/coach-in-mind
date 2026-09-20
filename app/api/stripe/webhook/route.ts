// POST /api/stripe/webhook
// Stripe calls this directly (server-to-server) the moment a payment
// actually succeeds. This route's own signature verification IS its
// authentication — there's no logged-in user, no admin session,
// which is exactly why it uses the service-role client to write
// directly to the database rather than going through the existing
// admin-PIN-gated mark_*_paid functions.
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text();

  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature or webhook secret." }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    // Signature didn't verify — this request did NOT genuinely come
    // from Stripe. Reject, don't process.
    return NextResponse.json({ error: `Webhook signature verification failed: ${(err as Error).message}` }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    // Not the event we care about — acknowledge and move on.
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceClient();

  // Idempotency: Stripe can deliver the same event more than once.
  // Recording the event ID first, and bailing out if it's already
  // there, means a duplicate delivery is a harmless no-op rather than
  // double-marking a listing paid or double-logging a payment.
  const { error: dedupeError } = await supabase.from("stripe_processed_events").insert({ event_id: event.id });
  if (dedupeError) {
    // A unique-constraint violation here means we've already handled
    // this exact event — that's success, not failure.
    return NextResponse.json({ received: true, note: "already processed" });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata ?? {};
  const listingTable = metadata.listingTable;
  const listingId = metadata.listingId;
  const packageSize = Number(metadata.packageSize);
  const mode = metadata.mode;
  const product = metadata.product;
  const role = metadata.role;
  const personId = metadata.personId;
  const amount = (session.amount_total ?? 0) / 100; // Stripe's own recorded amount, in dollars — the source of truth for what was actually charged

  if (!listingTable || !listingId || !amount) {
    console.error("Stripe webhook: missing expected metadata on session", session.id);
    return NextResponse.json({ received: true, note: "missing metadata, skipped" });
  }

  // coach2mentor_mentor_listings tracks capacity as max_mentees, not
  // included_introductions — every other table uses introductions.
  const usesIntroductions = listingTable !== "coach2mentor_mentor_listings";

  let introductionsToSet = packageSize;
  if (mode === "topup" && usesIntroductions) {
    const { data: current } = await supabase
      .from(listingTable)
      .select("included_introductions")
      .eq("id", listingId)
      .maybeSingle();
    introductionsToSet = (current?.included_introductions ?? 0) + packageSize;
  }

  const updatePayload: Record<string, unknown> = {
    paid: true,
    paid_at: new Date().toISOString(),
    price_aud: amount,
    status: "active",
  };
  if (usesIntroductions) {
    updatePayload.included_introductions = introductionsToSet;
    updatePayload.topup_requested = null; // clears any pending top-up request now that it's fulfilled
  } else {
    updatePayload.max_mentees = packageSize;
  }

  const { error: updateError } = await supabase.from(listingTable).update(updatePayload).eq("id", listingId);
  if (updateError) {
    console.error("Stripe webhook: failed to update listing", listingTable, listingId, updateError);
    return NextResponse.json({ error: "Failed to update listing." }, { status: 500 });
  }

  const { error: paymentError } = await supabase.from("payments").insert({
    person_id: personId,
    product,
    role,
    listing_table: listingTable,
    listing_id: listingId,
    amount_aud: amount,
    stripe_session_id: session.id,
    stripe_payment_intent_id:
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? null,
    marked_by_person_id: null, // system-marked via Stripe, not manually marked by an admin
  });
  if (paymentError) {
    console.error("Stripe webhook: failed to log payment", paymentError);
    // Listing is already marked paid above, which is the important
    // part — a missing ledger row is worth knowing about (hence the
    // log) but shouldn't make Stripe think the whole webhook failed
    // and retry, since retrying would re-run the listing update too.
  }

  return NextResponse.json({ received: true });
}
