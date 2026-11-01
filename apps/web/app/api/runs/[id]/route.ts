import { NextResponse } from "next/server";
import { getEvents, getRun, getSteps } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  try {
    const run = await getRun(id);
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
    const [steps, events] = await Promise.all([getSteps(id), getEvents(id, after)]);
    return NextResponse.json({ run, steps, events });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 502 });
  }
}
