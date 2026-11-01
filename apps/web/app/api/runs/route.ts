import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { listRuns } from "@/lib/data";
import { rest, write, signUpload, publicUrl } from "@/lib/supabase";
import { youtubeId } from "@/lib/youtube";

export const dynamic = "force-dynamic";

const MAX_ACTIVE = 4;
const REUSE_DAYS = 7;

export async function GET() {
  try {
    return NextResponse.json({ runs: await listRuns() });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 502 });
  }
}

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

async function dispatch(runId: string, videoUrl: string, sourceUrl: string) {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  const repo = process.env.GITHUB_REPO ?? "jenzylove/origin";
  if (!token) throw new Error("GITHUB_DISPATCH_TOKEN is not set");
  const res = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/run.yml/dispatches`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
    body: JSON.stringify({ ref: "main", inputs: { run_id: runId, video_url: videoUrl, source_url: sourceUrl } }),
  });
  if (!res.ok) throw new Error(`GitHub dispatch ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/**
 * POST { url }        YouTube link: reuse a recent finished run of that video, else start one.
 * POST { upload: true } returns a signed URL the browser PUTs an MP4 to, plus its key.
 * POST { key }        starts a run on an uploaded MP4.
 */
export async function POST(req: Request) {
  let body: { url?: string; upload?: boolean; key?: string };
  try { body = await req.json(); } catch { return fail("send JSON", 400); }

  try {
    if (body.upload) {
      const key = `inputs/${randomUUID()}.mp4`;
      return NextResponse.json({ key, uploadUrl: await signUpload(key) });
    }

    const active = await rest<{ id: string }>("runs", "select=id&status=in.(queued,extracting,running)");
    if (active.length >= MAX_ACTIVE) return fail(`${active.length} runs are going right now. Try again in a few minutes`, 429);

    if (body.url) {
      const vid = youtubeId(body.url);
      if (!vid) return fail("that is not a YouTube link", 400);
      const since = new Date(Date.now() - REUSE_DAYS * 864e5).toISOString();
      const [recent] = await rest<{ id: string }>("runs", `select=id&video_id=eq.${vid}&status=in.(queued,extracting,running,done)&created_at=gte.${since}&order=created_at.desc&limit=1`);
      if (recent) return NextResponse.json({ id: recent.id, reused: true });
      const source = `https://www.youtube.com/watch?v=${vid}`;
      const run = await write<{ id: string }>("runs", { video_id: vid, source_url: source, status: "queued" });
      await dispatch(run.id, "", source);
      return NextResponse.json({ id: run.id });
    }

    if (body.key && /^inputs\/[0-9a-f-]{36}\.mp4$/.test(body.key)) {
      const run = await write<{ id: string }>("runs", { status: "queued" });
      await dispatch(run.id, publicUrl(body.key), "");
      return NextResponse.json({ id: run.id });
    }

    return fail("paste a YouTube link or upload an MP4", 400);
  } catch (e) {
    return fail(String(e instanceof Error ? e.message : e), 502);
  }
}
