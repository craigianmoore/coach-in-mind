import { NextResponse } from "next/server";
import { canAccessResources } from "@/lib/server/resourceAccess";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ allowed: await canAccessResources() });
}
