import { NextResponse } from "next/server";
import { sendAdminEmail } from "@/lib/server/sendAdminEmail";

export async function POST(req: Request) {
  const { subject, text } = await req.json();

  if (!subject || !text) {
    return NextResponse.json({ ok: false, error: "Missing subject or text" }, { status: 400 });
  }

  const result = await sendAdminEmail(subject, text);
  return NextResponse.json(result, { status: 200 });
}
