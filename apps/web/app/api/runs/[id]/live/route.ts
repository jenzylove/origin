import { createHash, timingSafeEqual } from "node:crypto";
import { rest, readPrivate } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** The live frame of a run's browser, only for the person who started the run. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const control = new URL(req.url).searchParams.get("control") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(id) || !control) return new Response("not found", { status: 404 });
  try {
    const [run] = await rest<{ control_hash: string | null; status: string }>("runs", `select=control_hash,status&id=eq.${id}`);
    if (!run?.control_hash || run.status !== "waiting_user") return new Response("not found", { status: 404 });
    const given = Buffer.from(createHash("sha256").update(control).digest("hex"));
    const kept = Buffer.from(run.control_hash);
    if (given.length !== kept.length || !timingSafeEqual(given, kept)) return new Response("not found", { status: 404 });
    const img = await readPrivate(`live/${id}.jpg`);
    if (!img.ok) return new Response("no frame yet", { status: 404 });
    return new Response(img.body, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "no-store, private" } });
  } catch {
    return new Response("unavailable", { status: 503 });
  }
}
