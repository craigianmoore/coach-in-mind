"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { isValidPostcode } from "@/lib/postcode";

type Conflict = { id: string; club_id: string; proposed_postcode: string; clubs: { name: string; state: string; postcode: string | null } | null };
type Group = { club_id: string; name: string; state: string; current: string | null; proposed: string[] };

// Admin review of clubs that posted different postcodes. Confirming a postcode locks it: the app can never change it again.
export default function ClubPostcodePanel({ onCount }: { onCount?: (n: number) => void }) {
  const supabase = createClient();
  const [groups, setGroups] = useState<Group[]>([]);
  const [entry, setEntry] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");

  async function load() {
    const { data } = await supabase
      .from("club_postcode_conflicts")
      .select("id, club_id, proposed_postcode, clubs(name, state, postcode)")
      .order("created_at");
    const map = new Map<string, Group>();
    for (const r of ((data ?? []) as unknown as Conflict[])) {
      const g = map.get(r.club_id) ?? { club_id: r.club_id, name: r.clubs?.name ?? "Unknown club", state: r.clubs?.state ?? "", current: r.clubs?.postcode ?? null, proposed: [] };
      g.proposed.push(r.proposed_postcode);
      map.set(r.club_id, g);
    }
    const list = Array.from(map.values());
    setGroups(list);
    onCount?.(list.length);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function confirm(g: Group, pc: string) {
    if (!isValidPostcode(pc)) { setMsg("Enter a 4-digit postcode."); return; }
    if (!window.confirm(`Confirm ${pc} as the postcode for ${g.name}? It cannot be changed again from the app.`)) return;
    const { error } = await supabase.rpc("confirm_club_postcode", { target_club_id: g.club_id, new_postcode: pc });
    setMsg(error ? error.message : `${g.name} confirmed as ${pc}.`);
    await load();
  }

  if (groups.length === 0 && !msg) return null;
  return (
    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
      <p className="font-semibold text-amber-900">Clubs with different postcodes ({groups.length})</p>
      <p className="mt-1 text-amber-900">Investigate, then confirm the correct postcode. Once confirmed it is locked.</p>
      {msg && <p className="mt-2 text-gray-700">{msg}</p>}
      {groups.map((g) => (
        <div key={g.club_id} className="mt-3 rounded border bg-white p-2">
          <p className="font-medium">{g.name} <span className="text-gray-500">({g.state})</span></p>
          <p className="text-gray-600">On record: {g.current ?? "none"} · Also posted: {g.proposed.join(", ")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {[g.current, ...g.proposed].filter((p): p is string => !!p).map((p) => (
              <button key={p} type="button" onClick={() => confirm(g, p)} className="rounded border px-2 py-1 hover:bg-gray-50">Confirm {p}</button>
            ))}
            <input value={entry[g.club_id] ?? ""} onChange={(e) => setEntry({ ...entry, [g.club_id]: e.target.value })} placeholder="Other" maxLength={4} className="w-20 rounded border px-2 py-1" />
            <button type="button" onClick={() => confirm(g, entry[g.club_id] ?? "")} className="rounded border px-2 py-1 hover:bg-gray-50">Confirm other</button>
          </div>
        </div>
      ))}
    </div>
  );
}
