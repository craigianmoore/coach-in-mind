"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Requires a logged-in Supabase Auth session. Does NOT check whether a
// `people` profile row exists yet — use RequireProfile for that.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [checked, setChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    check();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function check() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setAuthed(true);
    setChecked(true);
  }

  if (!checked) {
    return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  }

  return authed ? <>{children}</> : null;
}
