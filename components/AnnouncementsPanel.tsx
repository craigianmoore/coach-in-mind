"use client";

// Admin "Announcements" tab: write a notice, choose who sees it and when, and switch it on or off.
// People see it as a dismissible banner when signed in (components/AnnouncementBanner.tsx).
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { REGIONS } from "@/lib/constants";

type Audience = { roles: string[]; regions: string[]; payment: "any" | "paid" | "unpaid"; activity: "any" | "active" | "inactive" };
type Row = {
  id: string;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
  audience: Audience;
  starts_at: string;
  ends_at: string | null;
  active: boolean;
  created_at: string;
};

const ROLE_OPTIONS = [
  { v: "coach", label: "Coaches (Club 2 Coach)" },
  { v: "club", label: "Clubs" },
  { v: "mentor", label: "Mentors" },
  { v: "mentee", label: "Coaches seeking a mentor" },
  { v: "none", label: "Signed up, no listing yet" },
];
const emptyAudience: Audience = { roles: [], regions: [], payment: "any", activity: "any" };
const fmt = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
const toLocalInput = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

function describe(a: Audience) {
  const parts: string[] = [];
  parts.push(a.roles.length ? a.roles.map((r) => ROLE_OPTIONS.find((o) => o.v === r)?.label ?? r).join(", ") : "Everyone");
  if (a.regions.length) parts.push(a.regions.length <= 3 ? a.regions.join(", ") : `${a.regions.length} regions`);
  if (a.payment !== "any") parts.push(a.payment === "paid" ? "paid" : "not paid");
  if (a.activity !== "any") parts.push(a.activity === "active" ? "active now" : "not active");
  return parts.join(" · ");
}

export default function AnnouncementsPanel() {
  const supabase = createClient();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [dismissed, setDismissed] = useState<Record<string, number>>({});
  const [reach, setReach] = useState<Record<string, number | null>>({});
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [linkLabel, setLinkLabel] = useState("");
  const [startsAt, setStartsAt] = useState(toLocalInput(new Date()));
  const [endsAt, setEndsAt] = useState("");
  const [aud, setAud] = useState<Audience>(emptyAudience);
  const [formReach, setFormReach] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function load() {
    const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false });
    if (error) {
      setRows([]);
      setMsg("Announcements aren't set up yet (the database step hasn't been run).");
      return;
    }
    const list = (data as Row[]) ?? [];
    setRows(list);
    const { data: d } = await supabase.from("announcement_dismissals").select("announcement_id");
    const counts: Record<string, number> = {};
    (d ?? []).forEach((x: { announcement_id: string }) => (counts[x.announcement_id] = (counts[x.announcement_id] ?? 0) + 1));
    setDismissed(counts);
    const out: Record<string, number | null> = {};
    await Promise.all(
      list.map(async (r) => {
        const { data: n } = await supabase.rpc("announcement_audience_count", { aud: r.audience });
        out[r.id] = typeof n === "number" ? n : null;
      })
    );
    setReach(out);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live "would reach N people" while editing the filters.
  useEffect(() => {
    if (editingId === null) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const { data } = await supabase.rpc("announcement_audience_count", { aud });
      setFormReach(typeof data === "number" ? data : null);
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aud, editingId]);

  function startNew() {
    setEditingId("new");
    setTitle("");
    setBody("");
    setLinkUrl("");
    setLinkLabel("");
    setStartsAt(toLocalInput(new Date()));
    setEndsAt("");
    setAud(emptyAudience);
    setMsg(null);
  }
  function startEdit(r: Row) {
    setEditingId(r.id);
    setTitle(r.title);
    setBody(r.body);
    setLinkUrl(r.link_url ?? "");
    setLinkLabel(r.link_label ?? "");
    setStartsAt(toLocalInput(new Date(r.starts_at)));
    setEndsAt(r.ends_at ? toLocalInput(new Date(r.ends_at)) : "");
    setAud({ ...emptyAudience, ...r.audience });
    setMsg(null);
  }
  const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function save() {
    if (!title.trim()) {
      setMsg("Please give it a title.");
      return;
    }
    const link = linkUrl.trim();
    if (link && !/^(https?:\/\/|\/)/i.test(link)) {
      setMsg("The link must start with https:// (or / for a page on this site).");
      return;
    }
    setBusy(true);
    const payload = {
      title: title.trim(),
      body: body.trim(),
      link_url: link || null,
      link_label: link ? linkLabel.trim() || null : null,
      audience: aud,
      starts_at: new Date(startsAt).toISOString(),
      ends_at: endsAt ? new Date(endsAt).toISOString() : null,
    };
    const res = editingId === "new" ? await supabase.from("announcements").insert({ ...payload, active: true }) : await supabase.from("announcements").update(payload).eq("id", editingId as string);
    setBusy(false);
    if (res.error) {
      setMsg(res.error.message);
      return;
    }
    setEditingId(null);
    setMsg(editingId === "new" ? "Published. People see it next time they open the app." : "Saved.");
    load();
  }
  async function setActive(r: Row, active: boolean) {
    await supabase.from("announcements").update({ active }).eq("id", r.id);
    load();
  }
  async function remove(r: Row) {
    if (!window.confirm(`Delete "${r.title}"? This also clears who has dismissed it.`)) return;
    await supabase.from("announcements").delete().eq("id", r.id);
    load();
  }

  const now = Date.now();
  const state = (r: Row) =>
    !r.active ? { t: "Off", c: "bg-gray-100 text-gray-600" } : new Date(r.starts_at).getTime() > now ? { t: "Scheduled", c: "bg-amber-100 text-amber-800" } : r.ends_at && new Date(r.ends_at).getTime() <= now ? { t: "Ended", c: "bg-gray-100 text-gray-600" } : { t: "Live", c: "bg-green-100 text-green-800" };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600">
          Notices shown at the top of the app to signed-in people you choose. Anyone can close one, and it stays closed for them. This doesn&apos;t use your
          100-a-day email allowance.
        </p>
        {editingId === null && (
          <button type="button" onClick={startNew} className="flex-shrink-0 rounded-lg bg-brand-navy px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navyLight">
            + New announcement
          </button>
        )}
      </div>
      {msg && <p className="mt-2 text-sm font-semibold text-gray-700">{msg}</p>}

      {editingId !== null && (
        <div className="mt-4 rounded-xl border bg-white p-4">
          <h3 className="text-base font-semibold">{editingId === "new" ? "New announcement" : "Edit announcement"}</h3>
          <label className="mt-3 block text-xs font-semibold uppercase text-gray-500">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="e.g. New: advertise for two roles" />
          <label className="mt-3 block text-xs font-semibold uppercase text-gray-500">Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={600} rows={3} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Keep it short: one or two sentences." />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">Link (optional)</label>
              <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="https://… or /help" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">Link text</label>
              <input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" placeholder="Read more" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">Starts</label>
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-500">Ends (optional)</label>
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm" />
            </div>
          </div>

          <p className="mt-4 text-xs font-semibold uppercase text-gray-500">Who sees it</p>
          <p className="text-xs text-gray-500">Leave a group empty to include everyone. Filters combine: a person must match all of them.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((o) => (
              <label key={o.v} className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold ${aud.roles.includes(o.v) ? "border-brand-navy bg-brand-navy text-white" : "border-gray-300 text-gray-700"}`}>
                <input type="checkbox" className="sr-only" checked={aud.roles.includes(o.v)} onChange={() => setAud({ ...aud, roles: toggle(aud.roles, o.v) })} />
                {o.label}
              </label>
            ))}
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500">Payment</label>
              <select value={aud.payment} onChange={(e) => setAud({ ...aud, payment: e.target.value as Audience["payment"] })} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm">
                <option value="any">Anyone</option>
                <option value="paid">Has paid real money</option>
                <option value="unpaid">Hasn&apos;t paid (free credit or nothing)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500">Activity</label>
              <select value={aud.activity} onChange={(e) => setAud({ ...aud, activity: e.target.value as Audience["activity"] })} className="mt-1 w-full rounded-lg border px-2 py-2 text-sm">
                <option value="any">Anyone</option>
                <option value="active">Active now (listing or advert live)</option>
                <option value="inactive">Not active now</option>
              </select>
            </div>
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer text-xs font-semibold text-gray-600">Regions {aud.regions.length ? `(${aud.regions.length} selected)` : "(all)"}</summary>
            <div className="mt-2 flex max-h-40 flex-wrap gap-1 overflow-y-auto">
              {REGIONS.map((r) => (
                <label key={r} className={`cursor-pointer rounded-full border px-2 py-0.5 text-[11px] ${aud.regions.includes(r) ? "border-brand-navy bg-brand-navy text-white" : "border-gray-300 text-gray-600"}`}>
                  <input type="checkbox" className="sr-only" checked={aud.regions.includes(r)} onChange={() => setAud({ ...aud, regions: toggle(aud.regions, r) })} />
                  {r}
                </label>
              ))}
            </div>
          </details>

          <p className="mt-4 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900">
            {formReach === null ? "Counting who this reaches…" : `This would show to ${formReach} ${formReach === 1 ? "person" : "people"} (signed-up accounts).`}
          </p>
          <div className="mt-4 flex gap-2">
            <button type="button" disabled={busy} onClick={save} className="rounded-lg bg-brand-navy px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {editingId === "new" ? "Publish" : "Save"}
            </button>
            <button type="button" onClick={() => setEditingId(null)} className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-semibold text-gray-700">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-col gap-2">
        {rows === null && <p className="text-sm text-gray-500">Loading…</p>}
        {rows && rows.length === 0 && editingId === null && <p className="text-sm text-gray-500">No announcements yet.</p>}
        {rows?.map((r) => {
          const st = state(r);
          return (
            <div key={r.id} className="rounded-xl border bg-white p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${st.c}`}>{st.t}</span>
                <p className="font-semibold">{r.title}</p>
              </div>
              {r.body && <p className="mt-1 text-sm text-gray-700">{r.body}</p>}
              <p className="mt-1 text-xs text-gray-500">
                {describe(r.audience)} · from {fmt(r.starts_at)}
                {r.ends_at ? ` to ${fmt(r.ends_at)}` : ""} · reaches {reach[r.id] ?? "?"} · {dismissed[r.id] ?? 0} closed it
              </p>
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                <button type="button" onClick={() => startEdit(r)} className="text-blue-700 hover:underline">Edit</button>
                <button type="button" onClick={() => setActive(r, !r.active)} className="text-gray-700 hover:underline">{r.active ? "Switch off" : "Switch on"}</button>
                <button type="button" onClick={() => remove(r)} className="text-red-600 hover:underline">Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
