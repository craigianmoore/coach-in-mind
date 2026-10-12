// Best-effort log of an email Resend refused, so the admin pages can warn. Never throws.
export async function recordEmailFailure(httpStatus: number | null, detail: string) {
  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    await createServiceClient().from("email_failures").insert({ http_status: httpStatus, detail: detail.slice(0, 500) });
  } catch {
    // Ignore: logging must never break the caller.
  }
}
