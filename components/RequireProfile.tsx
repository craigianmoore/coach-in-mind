"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Person } from "@/types/database";

// Requires login AND a completed shared `people` profile (name, mobile,
// email, region, licence). Coach2Coach/Coach2Mentor listing forms all
// build on top of that shared identity, so this runs before any of them.
export default function RequireProfile({
  children,
}: {
  children: (person: Person) => React.ReactNode;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [checked, setChecked] = useState(false);
  const [person, setPerson] = useState<Person | null>(null);

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

    const { data } = await supabase
      .from("people")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!data) {
      router.push(`/profile?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setPerson(data as Person);
    setChecked(true);
  }

  if (!checked) {
    return <p className="p-6 text-sm text-gray-500">Loading…</p>;
  }

  return person ? <>{children(person)}</> : null;
}
