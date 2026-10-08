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
import { runClub2CoachMatchSweep, runCoach2MentorMatchSweep } from "@/lib/matching/sweep";
import { notifyApprovedShares } from "@/lib/server/notifyMatches";
import { notifyMentoringRequests } from "@/lib/server/notifyMentoring";

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

  if (event.type !== "checkout.session.completed" && event.type !== "charge.refunded") {
    // Not an event we care about — acknowledge and move on.
    return NextResponse.json({ received: true });
  }

  const supabase = createServiceClient();

  // Idempotency: Stripe can deliver the same event more than once.
  // Recording the event ID first, and bailing out if it's already
  // there, means a duplicate delivery is a harmless no-op rather than
  // double-marking a listing paid or double-logging a payment.
  const { error: dedupeError } = await supabase.from("stripe_processed_events").insert({ event_id: event.id });
  // If handling fails below we return 500, so release the event id — otherwise Stripe's retry
  // would hit "already processed" and the payment would never be applied.
  const releaseEvent = () => supabase.from("stripe_processed_events").delete().eq("event_id", event.id);
  if (dedupeError) {
    // Only a unique-constraint violation means we've already handled this exact event.
    // Anything else (transient DB error) must make Stripe retry.
    if (dedupeError.code === "23505") {
      return NextResponse.json({ received: true, note: "already processed" });
    }
    console.error("Stripe webhook: could not record event", dedupeError);
    return NextResponse.json({ error: "Could not record event." }, { status: 500 });
  }

  if (event.type === "charge.refunded") {
    // A refund was issued in the Stripe dashboard (refunds are manual —
    // see Terms of Service §5, there's no in-app refund button). This
    // charge isn't necessarily one made through Checkout, so look it up
    // by payment_intent via our own payments ledger rather than trusting
    // any metadata on the charge itself.
    const charge = event.data.object as Stripe.Charge;
    const paymentIntentId =
      typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id ?? null;

    if (!paymentIntentId) {
      console.error("Stripe webhook: charge.refunded with no payment_intent", charge.id);
      return NextResponse.json({ received: true, note: "no payment_intent on charge" });
    }

    const { data: payment, error: paymentLookupError } = await supabase
      .from("payments")
      .select("id, listing_table, listing_id")
      .eq("stripe_payment_intent_id", paymentIntentId)
      .maybeSingle();

    if (paymentLookupError || !payment) {
      // Nothing in our ledger matches this payment_intent — most likely
      // a manual/legacy payment that predates Stripe entirely. Nothing
      // to reconcile automatically; an admin can note it manually.
      console.error("Stripe webhook: no payments row for refunded payment_intent", paymentIntentId);
      return NextResponse.json({ received: true, note: "no matching payment record" });
    }

    const now = new Date().toISOString();

    await supabase.from("payments").update({ status: "refunded", refunded_at: now }).eq("id", payment.id);

    // A refund replaces any credit already returned to a club for that advert.
    if (payment.listing_table === "club2coach_club_vacancies") {
      await supabase.from("club_recredits").update({ used_at: now }).eq("source_vacancy_id", payment.listing_id).is("used_at", null);
    }

    // Mirror onto the listing itself: flips it out of "active" (so it
    // drops out of matching, same as draft/paused/placed already do)
    // and records when, so admin views and the refund-reminder cron
    // both see it without a join.
    const { error: listingUpdateError } = await supabase
      .from(payment.listing_table)
      .update({ status: "refunded", refunded_at: now })
      .eq("id", payment.listing_id);
    if (listingUpdateError) {
      console.error("Stripe webhook: failed to mark listing refunded", payment.listing_table, payment.listing_id, listingUpdateError);
    }

    return NextResponse.json({ received: true });
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

  if (session.payment_status && session.payment_status !== "paid") {
    return NextResponse.json({ received: true, note: "not paid, skipped" });
  }
  if (!listingTable || !listingId || !amount) {
    console.error("Stripe webhook: missing expected metadata on session", session.id);
    return NextResponse.json({ received: true, note: "missing metadata, skipped" });
  }

  // coach2mentor_mentor_listings tracks capacity as max_mentees, not
  // included_introductions — every other table uses introductions.
  const usesIntroductions = listingTable !== "coach2mentor_mentor_listings";

  // Coach purchases are CREDITS added to the coach's bank (never overwritten),
  // spent later with the Activate button — buying does not start any clock.
  const isCoachListing = listingTable === "club2coach_coach_listings" || listingTable === "coach2mentor_coach_listings";
  let introductionsToSet = packageSize;
  let relistRefunded = false;
  if ((mode === "topup" || isCoachListing) && usesIntroductions) {
    const { data: current } = await supabase
      .from(listingTable)
      .select("included_introductions, paid, status")
      .eq("id", listingId)
      .maybeSingle();
    // An unpaid listing's included_introductions is only the package the coach asked for.
    introductionsToSet = (current?.paid ? current?.included_introductions ?? 0 : 0) + packageSize;
    relistRefunded = isCoachListing && current?.status === "refunded";
  }

  const updatePayload: Record<string, unknown> = {
    paid: true,
    paid_at: new Date().toISOString(),
    price_aud: amount,
  };
  if (relistRefunded) {
    // A coach who was refunded and buys again starts clean (otherwise the row stays "refunded" and excluded from the bank).
    updatePayload.status = "draft";
    updatePayload.refunded_at = null;
  }
  if (!isCoachListing) updatePayload.status = "active"; // coach listings go live only via the Activate button
  if (usesIntroductions) {
    updatePayload.included_introductions = introductionsToSet;
    updatePayload.topup_requested = null; // clears any pending top-up request now that it's fulfilled
  } else {
    // Mentor capacity: a top-up ADDS mentee places to what they already have.
    // Always ADD to an already-paid mentor (never overwrite), whatever the checkout mode said.
    const { data: cur } = await supabase.from(listingTable).select("max_mentees, paid").eq("id", listingId).maybeSingle();
    updatePayload.max_mentees = (cur?.paid ? cur?.max_mentees ?? 0 : 0) + packageSize;
  }

  const { error: updateError } = await supabase.from(listingTable).update(updatePayload).eq("id", listingId);
  if (updateError) {
    console.error("Stripe webhook: failed to update listing", listingTable, listingId, updateError);
    await releaseEvent();
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

  // Compute matches immediately, so whoever just paid doesn't have to
  // wait for an admin to open the Matches tab (or for the once-daily
  // safety-net cron) before they show up as matchable. Best-effort:
  // a failure here shouldn't turn a successful payment into a 500 that
  // makes Stripe retry the whole webhook.
  try {
    if (product === "club2coach") {
      const vacancyIds = listingTable === "club2coach_club_vacancies" ? [listingId] : undefined;
      await runClub2CoachMatchSweep(supabase, { vacancyIds });
      await notifyApprovedShares(supabase);
    } else if (product === "coach2mentor") {
      await runCoach2MentorMatchSweep(supabase);
      await notifyMentoringRequests(supabase);
    }
  } catch (err) {
    console.error("Stripe webhook: match sweep after payment failed", err);
  }

  return NextResponse.json({ received: true });
}
