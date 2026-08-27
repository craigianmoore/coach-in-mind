# Coach In Mind

One platform, two products: **Club2Coach** (clubs ↔ coaches) and
**Coach2Mentor** (coaches ↔ mentors). One login covers both — but every
role you activate (Club2Coach coach, Club2Coach club, Coach2Mentor
coach, Coach2Mentor mentor) is paid for separately.

**This replaces the earlier `club2coach` project entirely.** That was a
single-product, browse-and-swipe prototype. This is a full rebuild
around your actual Club2Coach and Coach2Mentor designs: private
admin-curated listings for Club2Coach, browsable mentor profiles for
Coach2Mentor, weighted match scoring for both, and a shared identity
with per-role payment gating. Don't try to merge the old project with
this one — start fresh from this folder.

## How the pieces fit together

- **`people`** — one row per login: name, mobile, email, gender,
  region, current licence. Shared across both products.
- **Four listing tables** — `club2coach_coach_listings`,
  `club2coach_club_vacancies`, `coach2mentor_coach_listings`,
  `coach2mentor_mentor_listings`. Each has its own `paid` flag. Paying
  for one never unlocks another, even for the same person.
- **Club2Coach is fully admin-curated.** Nobody browses anybody else's
  listing. You review scored matches in `/club2coach/admin` and choose
  which to share — that's what `club2coach_shares` records.
- **Coach2Mentor is self-service on the mentor side.** Mentor profiles
  (once paid + active + they've ticked "visible to coaches") are
  browsable. A coach requests a specific mentor; the mentor accepts or
  declines themselves — no admin step in that loop.
- **Contact details stay private either way.** `people.mobile` and
  `people.email` are never broadly readable. A coach only gains access
  to a mentor's actual contact record once that mentor accepts their
  request (see the RLS policy comments in `schema.sql`). Club2Coach
  works the same way via `club2coach_shares`.

## Setup

### 1. Create a Supabase project and run the schema
In the SQL Editor, paste and run `supabase/schema.sql` in full. It sets
up every table, the scoring-support indexes, and Row Level Security —
including the admin PIN functions.

### 2. Seed your admin PIN
Still in the SQL Editor, run (replacing with your actual 6-digit PIN):

```sql
select set_admin_pin('123456');
```

This is the one PIN that unlocks `/club2coach/admin` and
`/coach2mentor/admin` — shared across both products, tied to whichever
logged-in person enters it correctly (see `grant_admin_pin_session` in
the schema for exactly how). You can change it later from the same SQL
editor using `select change_admin_pin('old', 'new');`, or add that as
an in-app admin settings screen later.

### 3. Environment variables
Copy `.env.example` to `.env.local`, fill in your Supabase Project URL
and anon/publishable key.

### 4. Install and run

```bash
npm install
npm run dev
```

### 5. Deploy
Push to GitHub, import into Vercel, add the same two environment
variables there.

## Payment model — what's built vs. what's still manual

Every listing has a `paid` boolean that gates whether it's included in
matching (Club2Coach) or browsable (Coach2Mentor mentor listings). Right
now, marking something paid is a **manual admin action** — you click
"Mark paid" in the admin panel after receiving payment however you're
currently collecting it (bank transfer, in person, whatever). This
calls one of four `mark_*_paid` database functions, which is admin-only
by RLS (checked server-side, not just hidden in the UI).

This is deliberate for now, matching what we discussed: no live Stripe
integration until there's real demand. When you're ready for real
payment collection, the architecture is ready for it — each price
already lives as a constant in `lib/constants.ts`
(`ROLE_PRICES_AUD`), and swapping "manual mark as paid" for "Stripe
Checkout marks it paid via webhook" is a contained change, not a
rebuild.

## The scoring engine

`lib/scoring.ts` has the two scoring functions:

- `scoreClub2CoachMatch` — accreditation, ability, competition level,
  age group, geography, salary, gender — each weighted per your
  sliders in `/club2coach/admin`.
- `scoreCoach2MentorMatch` — specialism overlap, career stage,
  geography, availability, budget fit, gender — weighted via
  `/coach2mentor/admin`.

One honest limitation worth knowing: the "gender" sub-score in both
functions compares **stated preferences**, not verified actual gender —
because actual gender lives in the private `people` table, which isn't
broadly readable (by design, to protect contact info sitting in that
same table). If you want a truer gender match later, the clean fix is
adding a denormalised `gender` column directly on each listing table
(low sensitivity, unlike mobile/email) rather than loosening `people`
access.

## Victoria only, for now

`lib/constants.ts` holds every dropdown list — regions, competition
levels, accreditation ladder, specialisms — all scoped to Victoria.
When you add other states, this is where that change happens: likely
restructuring the flat lists into state-keyed objects
(`REGIONS_BY_STATE.VIC`, `REGIONS_BY_STATE.NSW`), which the forms
already read from a single source, so it's a constants-file and
form-dropdown change, not a schema rewrite.

## What's deliberately not built yet

- Live payment collection (see above)
- Email notifications (new match, new request, request accepted)
- Editable admin PIN from within the app (currently SQL-only)
- A way to browse/export all listings as CSV (the old prototype had
  this — worth adding back once there's real volume to export)
- Multiple listings per role (e.g. a coach open to two very different
  roles) — currently one listing per person per role table
