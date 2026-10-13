// Best-effort log of an email Resend refused. Temporary failures (quota, rate limit, outage) are
// queued so the hourly job retries them first; permanent ones (bad address) are listed for the admin.
// Never throws.
export type FailedMail = { to: string; subject: string; text: string; replyTo?: string; kind: "user" | "admin"; transient: boolean };

export async function recordEmailFailure(httpStatus: number | null, detail: string, mail?: FailedMail) {
  try {
    const { createServiceClient } = await import("@/lib/supabase/service");
    await createServiceClient()
      .from("email_failures")
      .insert({
        http_status: httpStatus,
        detail: detail.slice(0, 500),
        ...(mail
          ? {
              to_email: mail.to,
              subject: mail.subject,
              body: mail.text,
              reply_to: mail.replyTo ?? null,
              kind: mail.kind,
              status: mail.transient ? "queued" : "permanent",
            }
          : { status: "legacy" }),
      });
  } catch {
    // Ignore: logging must never break the caller.
  }
}
