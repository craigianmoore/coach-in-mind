"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Pages a signed-in person can always reach, even before they have a coach, club or mentor profile:
// the profile/set-up pages themselves, sign-in and legal pages, help and support, and the public home page.
const EXEMPT_EXACT = ["/", "/profile", "/login", "/signup", "/reset-password", "/help", "/support", "/terms", "/privacy"];
const EXEMPT_PREFIX = [
  "/club2coach/coach",
  "/club2coach/club",
  "/coach2mentor/coach",
  "/coach2mentor/mentor",
  "/club2coach/admin",
  "/coach2mentor/admin",
  "/api",
  "/private",
];

// Remembered for the life of the tab once someone is known to be set up, so we don't re-query on every page.
let cleared = false;

// Keeps a new sign-up from drifting off with a blank profile: a signed-in person who has no coach, club or
// mentor profile (so nobody can match them) is sent back to the set-up page. Admins are never redirected.
export default function ProfileGate() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (cleared) return;
    if (EXEMPT_EXACT.includes(pathname) || EXEMPT_PREFIX.some((p) => pathname.startsWith(p))) return;
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const { data: isAdmin } = await supabase.rpc("is_admin_caller");
        if (isAdmin === true) {
          cleared = true;
          return;
        }
        const { data: p } = await supabase.from("people").select("id").eq("user_id", user.id).maybeSingle();
        if (!p) {
          if (!cancelled) router.replace("/profile");
          return;
        }
        const [c2c, c2m, vac, men] = await Promise.all([
          supabase.from("club2coach_coach_listings").select("id").eq("person_id", p.id).is("deleted_at", null).limit(1).maybeSingle(),
          supabase.from("coach2mentor_coach_listings").select("id").eq("person_id", p.id).is("deleted_at", null).limit(1).maybeSingle(),
          supabase.from("club2coach_club_vacancies").select("id").eq("person_id", p.id).is("deleted_at", null).limit(1).maybeSingle(),
          supabase.from("coach2mentor_mentor_listings").select("id").eq("person_id", p.id).is("deleted_at", null).limit(1).maybeSingle(),
        ]);
        if (c2c.data || c2m.data || vac.data || men.data) {
          cleared = true;
          return;
        }
        if (!cancelled) router.replace("/profile");
      } catch {
        /* never block someone because of a failed check */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  return null;
}
