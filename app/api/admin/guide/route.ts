// Serves the admin guide PDF, but only to a signed-in admin (valid PIN session).
// The file lives in /private, outside the public folder, so it can't be fetched directly.
//   GET            -> shown in the page / new tab
//   GET ?download=1 -> saved as a file
import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin_caller");
  if (isAdmin !== true) return new NextResponse("Admin sign-in required.", { status: 401 });
  const file = await readFile(path.join(process.cwd(), "private", "admin", "admin-guide.pdf"));
  const download = new URL(req.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Coach-In-Mind-Admin-Guide.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
