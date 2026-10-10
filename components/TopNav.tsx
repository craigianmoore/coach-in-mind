"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CoachInMindLogo from "@/components/CoachInMindLogo";

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();
  // null = not yet known, so neither Log in nor Log out flashes on load.
  const [loggedIn, setLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLoggedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
    });
    return () => sub.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLandingPage = pathname === "/";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="border-b border-white/10 bg-brand-navy text-sm text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
        <Link
          href="/help"
          className="flex items-center gap-2 font-semibold tracking-wide hover:text-brand-goldLight"
        >
          <CoachInMindLogo size={32} />
          COACH IN MIND (Resources)
        </Link>
        <nav className="flex items-center gap-4">
          <a
            href="/how-to-use.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-goldLight"
          >
            How To Use
          </a>
          {!isLandingPage && (
            <>
              <Link href="/" className="hover:text-brand-goldLight">
                Home
              </Link>
              <Link href="/club2coach" className="hover:text-brand-goldLight">
                Club 2 Coach
              </Link>
              <Link href="/coach2mentor" className="hover:text-brand-goldLight">
                Coach 2 Mentor
              </Link>
            </>
          )}
          {loggedIn && (
            <Link href="/profile" className="hover:text-brand-goldLight">
              My Profile
            </Link>
          )}
          <Link href="/support" className="hover:text-brand-goldLight">
            Report an Issue
          </Link>
          {loggedIn === true && (
            <button onClick={handleLogout} className="hover:text-brand-goldLight">
              Log out
            </button>
          )}
          {loggedIn === false && (
            <Link href="/login" className="hover:text-brand-goldLight">
              Log in
            </Link>
          )}
        </nav>
      </div>
    </div>
  );
}
