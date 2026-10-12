"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Red warning on the admin pages when Resend has refused emails in the last 24 hours
// (most often the Free plan's 100-a-day limit). Silent if there are none, or the
// email_failures table isn't there yet.
export default function EmailFailureBanner() {
  const supabase = createClient();
  const [count, setCount] = useState(0);
  useEffect(() => {
    const since = new Date(Date.now() - 24 * 3600_000).toISOString();
    supabase
      .from("email_failures")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since)
      .then(({ count: c, error }) => {
        if (!error) setCount(c ?? 0);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (count === 0) return null;
  return (
    <div className="mt-4 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
      <strong>{count} email{count === 1 ? "" : "s"} failed to send in the last 24 hours.</strong> People may not have
      received a welcome, match or reminder email. Check your Resend plan (the Free plan stops at 100 a day) at
      resend.com, then check the Logs there for details.
    </div>
  );
}
