"use client";

// Reads the same platform_settings.stripe_payments_enabled row the
// admin dashboards toggle (Admins tab, both products — one shared
// switch). Used by the four listing-creation forms to cap package
// selection to the smallest tier while card payments are off, so a
// trial period stays a trial: nobody can select "5 introductions" for
// Moorey to have to manually chase up. Fails open to `true` (no cap)
// if the row can't be read, matching the admin pages' own fail-open
// behaviour — a fetch hiccup should never silently block signups.
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function useStripePaymentsEnabled(): boolean {
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase
      .from("platform_settings")
      .select("stripe_payments_enabled")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data && data.stripe_payments_enabled === false) {
          setEnabled(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return enabled;
}
