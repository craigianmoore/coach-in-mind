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
