"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const isLandingPage = pathname === "/";

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <div className="border-b border-white/10 bg-brand-navy text-sm text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-2">
        <Link href="/" className="font-semibold tracking-wide">
          Coach In Mind
        </Link>
        <nav className="flex items-center gap-4">
          {!isLandingPage && (
            <>
              <Link href="/club2coach" className="hover:text-brand-goldLight">
                Club 2 Coach
              </Link>
              <Link href="/coach2mentor" className="hover:text-brand-goldLight">
                Coach 2 Mentor
              </Link>
            </>
          )}
          <Link href="/profile" className="hover:text-brand-goldLight">
            My Profile
          </Link>
          <Link href="/support" className="hover:text-brand-goldLight">
            Report an Issue
          </Link>
          <button onClick={handleLogout} className="hover:text-brand-goldLight">
            Log out
          </button>
        </nav>
      </div>
    </div>
  );
}
