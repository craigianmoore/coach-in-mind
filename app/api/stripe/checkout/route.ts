// POST /api/stripe/checkout
// Creates a Stripe Checkout Session for a coach/club/mentor paying
// for (or topping up) a listing. The browser only ever tells us WHICH
// listing and WHICH package size — never an amount. The amount is
// always looked up here, server-side, from the same package tables
// the rest of the app already uses, so nothing sent from the browser
// can change what actually gets charged.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server"; // ASSUMPTION — see note below
import { stripe } from "@/lib/stripe";
import {
  CLUB2COACH_COACH_PACKAGES,
  CLUB2COACH_CLUB_PACKAGES,
  COACH2MENTOR_MENTOR_CAPACITY_PACKAGES,
} from "@/lib/constants";

// I'm assuming your server-side Supabase client (the one that reads
// the logged-in user's cookies, as opposed to the browser client or
// the service-role client) lives at lib/supabase/server.ts and
// exports a createClient() function, following the standard
// @supabase/ssr Next.js App Router pattern. If your actual file is
// named or structured differently, this import needs adjusting —
// paste me that file and I'll fix this line specifically rather than
// you having to guess.

type ListingTable =
  | "club2coach_coach_listings"
  | "club2coach_club_vacancies"
  | "coach2mentor_coach_listings"
  | "coach2mentor_mentor_listings";

const TABLE_INFO: Record<
  ListingTable,
  { product: "club2coach" | "coach2mentor"; role: "coach" | "club" | "mentor"; label: string }
> = {
  club2coach_coach_listings: { product: "club2coach", role: "coach", label: "Club2Coach coach listing" },
  club2coach_club_vacancies: { product: "club2coach", role: "club", label: "Club2Coach vacancy" },
  coach2mentor_coach_listings: { product: "coach2mentor", role: "coach", label: "Coach2Mentor coach listing" },
  coach2mentor_mentor_listings: { product: "coach2mentor", role: "mentor", label: "Coach2Mentor mentor listing" },
};

function lookupAmount(listingTable: ListingTable, packageSize: number): number | null {
  const map =
    listingTable === "club2coach_coach_listings"
      ? CLUB2COACH_COACH_PACKAGES
      : listingTable === "club2coach_club_vacancies"
      ? CLUB2COACH_CLUB_PACKAGES
      : listingTable === "coach2mentor_coach_listings"
      ? CLUB2COACH_COACH_PACKAGES // Coach2Mentor's coach side reuses the same package numbers, same as the existing UI does
      : COACH2MENTOR_MENTOR_CAPACITY_PACKAGES; // coach2mentor_mentor_listings
  return map[packageSize] ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const listingTable = body.listingTable as ListingTable;
  const listingId = body.listingId as string;
  const packageSize = Number(body.packageSize);
  const mode: "new" | "topup" = body.mode === "topup" ? "topup" : "new";

  if (!TABLE_INFO[listingTable] || !listingId || !packageSize) {
    return NextResponse.json({ error: "Missing or invalid listingTable, listingId, or packageSize." }, { status: 400 });
  }

  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  // Global kill switch — checked before anything else. If off, don't
  // even reveal whether the listing exists.
  const { data: settings } = await supabase.from("platform_settings").select("stripe_payments_enabled").maybeSingle();
  if (settings?.stripe_payments_enabled === false) {
    return NextResponse.json({ error: "Card payments are currently unavailable. Please contact Coach In Mind." }, { status: 503 });
  }

  // Ownership check via RLS: this SELECT only returns a row if the
  // signed-in user actually owns this listing (or is an admin) —
  // the existing "owner or admin can view" policy on every one of
  // these four tables already enforces that. No row back means no
  // access, full stop.
  const { data: listing, error: listingError } = await supabase
    .from(listingTable)
    .select("id, person_id")
    .eq("id", listingId)
    .maybeSingle();

  if (listingError || !listing) {
    return NextResponse.json({ error: "Listing not found, or you don't have access to it." }, { status: 403 });
  }

  const amount = lookupAmount(listingTable, packageSize);
  if (amount == null) {
    return NextResponse.json({ error: "Not a valid package size for this listing type." }, { status: 400 });
  }

  const { product, role, label } = TABLE_INFO[listingTable];
  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "aud",
          unit_amount: Math.round(amount * 100), // Stripe expects cents
          product_data: {
            name:
              mode === "topup"
                ? `${label} — top-up (${packageSize} more)`
                : `${label} — ${packageSize} package`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      listingTable,
      listingId,
      packageSize: String(packageSize),
      mode,
      product,
      role,
      personId: listing.person_id,
    },
    success_url: `${origin}/${product === "club2coach" ? "club2coach" : "coach2mentor"}/${role}?paid=1`,
    cancel_url: `${origin}/${product === "club2coach" ? "club2coach" : "coach2mentor"}/${role}?paid=0`,
  });

  return NextResponse.json({ url: session.url });
}
