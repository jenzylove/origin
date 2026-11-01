import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { rest, write } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const KINDS = new Set(["click", "text", "key", "scroll", "done"]);

/**
 * Relays one click or keystroke to the run's live browser. Only the browser holding the
 * run's control token can send, and only while the run waits for a login. Inputs go to a
 * private table the runner empties as it applies them; nothing here is logged.
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return NextResponse.json({ error: "bad run" }, { status: 400 });
  let body: { control?: string; kind?: string; payload?: Record<string, unknown> };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "send JSON" }, { status: 400 }); }
  if (!body.control || !body.kind || !KINDS.has(body.kind)) return NextResponse.json({ error: "bad input" }, { status: 400 });

  const [run] = await rest<{ status: string; control_hash: string | null }>("runs", `select=status,control_hash&id=eq.${id}`);
  if (!run?.control_hash) return NextResponse.json({ error: "this run has no live browser" }, { status: 403 });
  const given = Buffer.from(createHash("sha256").update(body.control).digest("hex"));
  const kept = Buffer.from(run.control_hash);
  if (given.length !== kept.length || !timingSafeEqual(given, kept)) return NextResponse.json({ error: "only the person who started this run can control it" }, { status: 403 });
  if (run.status !== "waiting_user") return NextResponse.json({ error: "the run is not waiting for you" }, { status: 409 });

  const p = body.payload ?? {};
  const payload =
    body.kind === "click" ? { x: Math.round(Number(p.x)), y: Math.round(Number(p.y)) }
    : body.kind === "text" ? { text: String(p.text ?? "").slice(0, 500) }
    : body.kind === "key" ? { key: String(p.key ?? "") }
    : body.kind === "scroll" ? { dy: Math.round(Number(p.dy) || 0) }
    : {};
  await write("inputs", { run_id: id, kind: body.kind, payload });
  return NextResponse.json({ ok: true });
}
