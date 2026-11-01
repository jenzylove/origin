import { NextResponse } from "next/server";
import { listRuns } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ runs: await listRuns() });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 502 });
  }
}

// Creating runs is not wired yet.
export async function POST() {
  return NextResponse.json({ error: "not wired yet" }, { status: 501 });
}
