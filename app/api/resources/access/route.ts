import { NextResponse } from "next/server";
import { resourceAccess } from "@/lib/server/resourceAccess";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await resourceAccess());
}
