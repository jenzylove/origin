import { NextResponse } from "next/server";
import { getEvents, getRun, getStepsLight, isUuid } from "@/lib/data";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0) || 0;
  if (!isUuid(id)) return NextResponse.json({ error: "Run not found" }, { status: 404 });
  try {
    const run = await getRun(id);
    if (!run) return NextResponse.json({ error: "Run not found" }, { status: 404 });
    const [steps, events] = await Promise.all([getStepsLight(id), getEvents(id, after)]);
    return NextResponse.json({ run, steps, events });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not load this run right now" }, { status: 502 });
  }
}
