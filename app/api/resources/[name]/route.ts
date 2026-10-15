// Serves the club resource PDFs, but only to clubs that have paid (and admins).
// The files live in /private, outside the public folder, so there is no way to fetch them directly.
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { canAccessResources } from "@/lib/server/resourceAccess";

export const dynamic = "force-dynamic";

const FILES = ["coach-influence-manual.pdf", "coach-interview-checklist.pdf"];

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!FILES.includes(name)) return new NextResponse("Not found", { status: 404 });
  if (!(await canAccessResources())) {
    return new NextResponse("These resources unlock when your club's vacancy is paid for and live.", { status: 403 });
  }
  const file = await readFile(path.join(process.cwd(), "private", "resources", name));
  return new NextResponse(new Uint8Array(file), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}"`, "Cache-Control": "private, no-store" },
  });
}
