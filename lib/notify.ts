// Best-effort admin notification — fires an email to the Coach In Mind
// team whenever something new is created. Never throws: if this fails,
// the thing that was just saved is already safely in the database
// regardless, so a notification hiccup should never block the user.
export async function notifyAdmin(subject: string, text: string) {
  try {
    await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, text }),
    });
  } catch {
    // Ignore — the underlying record is already saved.
  }
}

// Best-effort confirmation email to the signed-in user themselves.
// The server decides the recipient (their own address) and the wording;
// the client only says which kind of confirmation and a short detail.
export async function notifySelf(type: "signup" | "signup_coach" | "signup_club" | "signup_mentor" | "coach_listing" | "vacancy" | "coach_profile" | "mentor_profile", detail = "") {
  try {
    await fetch("/api/notify-self", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, detail }),
    });
  } catch {
    // Ignore — never block the user.
  }
}

// Asks the server to email both sides of any newly approved introductions.
// Admin-only on the server; safe to call repeatedly (each match is only
// ever emailed once).
export async function notifyMatches() {
  try {
    await fetch("/api/notify-matches", { method: "POST" });
  } catch {
    // Ignore.
  }
}

// Asks the server to send any due Coach2Mentor "matched"/request emails.
// Safe to call repeatedly — each is only sent once.
export async function notifyMentoring() {
  try {
    await fetch("/api/notify-mentoring", { method: "POST" });
  } catch {
    // Ignore.
  }
}
