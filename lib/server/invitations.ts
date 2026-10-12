// The one-off coach invitation email, and helpers for the admin send tool.
export const INVITE_SUBJECT = "An invitation to join Coach In Mind (free for the first 100 coaches)";

// Soft daily ceiling across everything Resend sends. The Free plan stops at 100 a day and the app's own
// emails (welcomes, confirmations, alerts) share it, so invitations stop at this many in any 24 hours.
// Raise it if the Resend plan is upgraded.
export const INVITE_DAILY_CAP = 85;

export function inviteText(first: string) {
  const hi = first ? `Hi ${first},` : "Hi there,";
  return `${hi}

You’re receiving this one-off invitation because, as a coach, you may be interested to hear about football coaching opportunities.

Coach In Mind connects football coaches with clubs looking for coaches, and with mentors who can help coaches develop. We're opening to coaches first and bringing clubs in shortly, so coaches who join now will be in place when clubs arrive.

The first 100 coaches get a free founding credit, so it costs nothing to try.

Sign up here: https://www.coachinmind.com.au/signup

Our one-page flyer: https://www.coachinmind.com.au/coach-in-mind-flyer.pdf

This isn't a regular newsletter. If you'd rather not hear from us again, just reply "no thanks" and we'll remove you.`;
}

// Minimal CSV parser (handles quoted fields).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); cur = "";
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
    } else cur += c;
  }
  row.push(cur);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows;
}

export function firstNameOf(full: string) {
  const f = full.trim().split(/\s+/)[0] ?? "";
  if (!f) return "";
  return f === f.toLowerCase() || f === f.toUpperCase() ? f.charAt(0).toUpperCase() + f.slice(1).toLowerCase() : f;
}
