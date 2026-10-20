"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type * as LeafletNS from "leaflet";
import "leaflet/dist/leaflet.css";
import { createClient } from "@/lib/supabase/client";
import { fetchAll } from "@/lib/fetchAll";

// Admin "Map" tab: where coaches, clubs and mentors are, by the postcode each person entered. Only counts per postcode
// are shown (no names or contact details), placed at the postcode's centre. Admin-only, read-only.
// Postcode locations: GeoNames (CC BY 4.0). Map tiles: OpenStreetMap contributors.

type Layer = "coaches" | "clubs" | "mentors";
const COLOURS: Record<Layer, string> = { coaches: "#2563eb", clubs: "#ea580c", mentors: "#16a34a" };
const LABELS: Record<Layer, string> = { coaches: "Coaches", clubs: "Clubs", mentors: "Mentors" };
// Drawn largest first so smaller circles stay visible on top of them at the same postcode.
const DRAW_ORDER: Layer[] = ["coaches", "clubs", "mentors"];
const BASE_RADIUS: Record<Layer, number> = { coaches: 9, clubs: 7, mentors: 5 };

type Person = { id: string; postcode: string | null };
type CoachListing = { person_id: string; status: string; deleted_at: string | null; active_until: string | null };
type MentorListing = { person_id: string; status: string; deleted_at: string | null; paid: boolean | null; verified_at: string | null; currently_open: boolean | null };
type Vacancy = { person_id: string; postcode: string | null; status: string; paid: boolean | null; deleted_at: string | null };

type Counts = Record<string, Record<Layer, number>>; // postcode -> layer -> people

export default function HotSpotMapPanel() {
  const supabase = useMemo(() => createClient(), []);
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const groupRef = useRef<LeafletNS.LayerGroup | null>(null);
  const leafletRef = useRef<typeof LeafletNS | null>(null);
  const centroidsRef = useRef<Record<string, [number, number]> | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState<Record<Layer, boolean>>({ coaches: true, clubs: true, mentors: true });
  const [activeOnly, setActiveOnly] = useState(false);
  const [raw, setRaw] = useState<{ people: Person[]; c2c: CoachListing[]; c2m: CoachListing[]; mentors: MentorListing[]; vacancies: Vacancy[] } | null>(null);

  // Load the data (admin RLS lets an admin read all of these).
  useEffect(() => {
    (async () => {
      try {
        const [people, c2c, c2m, mentors, vacancies] = await Promise.all([
          fetchAll<Person>((a, b) => supabase.from("people").select("id, postcode").order("id").range(a, b)),
          fetchAll<CoachListing>((a, b) => supabase.from("club2coach_coach_listings").select("person_id, status, deleted_at, active_until").order("id").range(a, b)),
          fetchAll<CoachListing>((a, b) => supabase.from("coach2mentor_coach_listings").select("person_id, status, deleted_at, active_until").order("id").range(a, b)),
          fetchAll<MentorListing>((a, b) => supabase.from("coach2mentor_mentor_listings").select("person_id, status, deleted_at, paid, verified_at, currently_open").order("id").range(a, b)),
          fetchAll<Vacancy>((a, b) => supabase.from("club2coach_club_vacancies").select("person_id, postcode, status, paid, deleted_at").order("id").range(a, b)),
        ]);
        setRaw({ people, c2c, c2m, mentors, vacancies });
      } catch {
        setError("Couldn't load the data. An admin session is needed.");
      }
      setLoading(false);
    })();
  }, [supabase]);

  // Who is in which layer, and at which postcode.
  const { counts, withoutPostcode } = useMemo(() => {
    const counts: Counts = {};
    const noPc: Record<Layer, number> = { coaches: 0, clubs: 0, mentors: 0 };
    if (!raw) return { counts, withoutPostcode: noPc };
    const now = Date.now();
    const pcOf = new Map(raw.people.map((p) => [p.id, (p.postcode ?? "").trim()]));
    const add = (layer: Layer, postcode: string | null | undefined) => {
      const pc = (postcode ?? "").trim();
      if (!/^\d{4}$/.test(pc)) { noPc[layer]++; return; }
      (counts[pc] ??= { coaches: 0, clubs: 0, mentors: 0 })[layer]++;
    };
    const liveCoach = (l: CoachListing) => !l.deleted_at && (!activeOnly || (l.status === "active" && !!l.active_until && new Date(l.active_until).getTime() > now));
    const coachIds = new Set<string>();
    raw.c2c.filter(liveCoach).forEach((l) => coachIds.add(l.person_id));
    raw.c2m.filter(liveCoach).forEach((l) => coachIds.add(l.person_id));

    const mentorIds = new Set<string>();
    raw.mentors
      .filter((m) => !m.deleted_at && (!activeOnly || (m.status === "active" && m.paid === true && !!m.verified_at && m.currently_open !== false)))
      .forEach((m) => mentorIds.add(m.person_id));

    // A club is counted once per club contact and postcode, however many vacancies it has advertised.
    const clubKeys = new Map<string, string>();
    raw.vacancies
      .filter((v) => !v.deleted_at && (!activeOnly || (v.paid === true && !["filled", "expired", "refunded", "superseded"].includes(v.status))))
      .forEach((v) => {
        const pc = (v.postcode ?? "").trim() || pcOf.get(v.person_id) || "";
        clubKeys.set(`${v.person_id}:${pc}`, pc);
      });

    // "Coaches" also includes people who have signed up but not chosen a role yet (when not limiting to active listings).
    const hasAnyRole = (id: string) => coachIds.has(id) || mentorIds.has(id) || raw.vacancies.some((v) => v.person_id === id && !v.deleted_at);
    if (!activeOnly) raw.people.forEach((p) => { if (!hasAnyRole(p.id) && !raw.mentors.some((m) => m.person_id === p.id) && !raw.c2c.concat(raw.c2m).some((l) => l.person_id === p.id)) coachIds.add(p.id); });

    coachIds.forEach((id) => add("coaches", pcOf.get(id)));
    mentorIds.forEach((id) => add("mentors", pcOf.get(id)));
    clubKeys.forEach((pc) => add("clubs", pc));
    return { counts, withoutPostcode: noPc };
  }, [raw, activeOnly]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default as unknown as typeof LeafletNS;
      centroidsRef.current = (await import("@/lib/data/postcodeCentroids.json")).default as unknown as Record<string, [number, number]>;
      if (cancelled || !mapEl.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(mapEl.current, { scrollWheelZoom: false }).setView([-37.0, 145.0], 7);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 15,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Postcodes: <a href="https://www.geonames.org">GeoNames</a> (CC BY 4.0)',
      }).addTo(map);
      groupRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw the circles when the data or the toggles change.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const group = groupRef.current;
    const centroids = centroidsRef.current;
    if (!ready || !L || !map || !group || !centroids) return;
    group.clearLayers();
    const points: LeafletNS.LatLngTuple[] = [];
    for (const layer of DRAW_ORDER) {
      if (!show[layer]) continue;
      for (const [pc, c] of Object.entries(counts)) {
        const n = c[layer];
        const at = centroids[pc];
        if (!n || !at) continue;
        points.push(at);
        const parts = (Object.keys(LABELS) as Layer[]).filter((l) => c[l] > 0).map((l) => `${c[l]} ${LABELS[l].toLowerCase()}`);
        L.circleMarker(at, {
          radius: BASE_RADIUS[layer] + 4 * Math.sqrt(n),
          color: COLOURS[layer],
          weight: 2,
          fillColor: COLOURS[layer],
          fillOpacity: layer === "coaches" ? 0.3 : 0.5,
        })
          .bindTooltip(`<strong>${pc}</strong>: ${parts.join(", ")}`)
          .addTo(group);
      }
    }
    if (points.length) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 11 });
  }, [ready, counts, show]);

  const totals = useMemo(() => {
    const t: Record<Layer, number> = { coaches: 0, clubs: 0, mentors: 0 };
    Object.values(counts).forEach((c) => (Object.keys(t) as Layer[]).forEach((l) => (t[l] += c[l])));
    return t;
  }, [counts]);

  const top = useMemo(
    () =>
      Object.entries(counts)
        .map(([pc, c]) => ({ pc, ...c, total: c.coaches + c.clubs + c.mentors }))
        .sort((a, b) => b.total - a.total || a.pc.localeCompare(b.pc))
        .slice(0, 10),
    [counts]
  );

  return (
    <div className="mt-6 flex flex-col gap-4 text-sm">
      <p className="max-w-2xl text-gray-600">
        Where people are, by the postcode they entered. Bigger circles mean more people. Hover a circle for the postcode and counts. Only counts are shown, never names.
      </p>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {(Object.keys(LABELS) as Layer[]).map((l) => (
          <label key={l} className="flex items-center gap-2">
            <input type="checkbox" checked={show[l]} onChange={(e) => setShow((s) => ({ ...s, [l]: e.target.checked }))} />
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: COLOURS[l] }} />
            <span>
              {LABELS[l]} <span className="text-gray-500">({totals[l]})</span>
            </span>
          </label>
        ))}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} />
          <span>Active listings only</span>
        </label>
        <button
          onClick={() => mapRef.current?.setView([-37.0, 145.0], 7)}
          className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
        >
          Show all of Victoria
        </button>
      </div>

      {error && <div className="rounded-lg bg-red-50 p-3 text-red-700">{error}</div>}
      {loading && !error && <div className="text-gray-500">Loading…</div>}

      <div ref={mapEl} className="h-[480px] w-full rounded-lg border border-gray-200" aria-label="Map of coaches, clubs and mentors by postcode" />

      <div className="text-xs text-gray-500">
        Not shown (no postcode entered): {withoutPostcode.coaches} coaches, {withoutPostcode.clubs} clubs, {withoutPostcode.mentors} mentors.
        {" "}Coaches include people who have signed up but not yet chosen a role{activeOnly ? " (hidden while showing active listings only)" : ""}.
      </div>

      {top.length > 0 && (
        <div className="max-w-xl overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-3 py-2">Postcode</th>
                <th className="px-3 py-2">Coaches</th>
                <th className="px-3 py-2">Clubs</th>
                <th className="px-3 py-2">Mentors</th>
              </tr>
            </thead>
            <tbody>
              {top.map((r) => (
                <tr key={r.pc} className="border-t">
                  <td className="px-3 py-1.5 font-medium">{r.pc}</td>
                  <td className="px-3 py-1.5">{r.coaches}</td>
                  <td className="px-3 py-1.5">{r.clubs}</td>
                  <td className="px-3 py-1.5">{r.mentors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
