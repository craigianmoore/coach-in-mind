"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Intro = {
  share_id: string;
  shared_at: string;
  summary: string;
  contact_name: string;
  contact_email: string;
  contact_mobile: string;
};

// "Your introductions" — the other party's contact details for every
// approved match on this listing. This is where the "you've been matched"
// email sends people to.
export default function MatchedContacts({
  listingTable,
  listingId,
  heading = "Your introductions",
}: {
  listingTable: "club2coach_coach_listings" | "club2coach_club_vacancies";
  listingId: string;
  heading?: string;
}) {
  const supabase = createClient();
  const [rows, setRows] = useState<Intro[] | null>(null);

  useEffect(() => {
    supabase
      .rpc("get_my_c2c_introductions", { listing_table: listingTable, target_listing_id: listingId })
      .then(({ data }) => setRows((data as Intro[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingTable, listingId]);

  if (!rows || rows.length === 0) return null;

  return (
    <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
      <h2 className="font-semibold">{heading}</h2>
      <p className="mt-1 text-xs text-green-800">Get in touch directly — your details have been shared with them too.</p>
      <div className="mt-3 flex flex-col gap-3">
        {rows.map((r) => (
          <div key={r.share_id} className="rounded-lg border border-green-200 bg-white p-3">
            <p className="text-xs text-gray-500">
              {r.summary} · matched {new Date(r.shared_at).toLocaleDateString("en-GB")}
            </p>
            <p className="mt-1 font-medium text-gray-900">{r.contact_name}</p>
            <p className="mt-0.5">
              <a href={`mailto:${r.contact_email}`} className="text-blue-700 underline">
                {r.contact_email}
              </a>
            </p>
            <p>
              <a href={`tel:${r.contact_mobile}`} className="text-blue-700 underline">
                {r.contact_mobile}
              </a>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
