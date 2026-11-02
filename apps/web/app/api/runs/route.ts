import { NextResponse } from "next/server";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { listRuns } from "@/lib/data";
import { rest, write, patch, signUpload, objectSize, signDownload, publicUrl } from "@/lib/supabase";
import { youtubeId } from "@/lib/youtube";

export const dynamic = "force-dynamic";

const MAX_ACTIVE = 3;
// Every run spends real model credit, so the public site starts at most this many an hour.
const MAX_PER_HOUR = 12;
const MAX_UPLOAD = 50_000_000;
const REUSE_DAYS = 7;

export async function GET() {
  try {
    return NextResponse.json({ runs: await listRuns() });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 502 });
  }
}

// The starter's browser keeps the token; we keep only its hash. It controls the live browser.
function control() {
  const token = randomBytes(24).toString("hex");
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

async function ingestOnline(): Promise<boolean> {
  try {
    const res = await fetch(publicUrl("status/ingest.json"), { cache: "no-store" });
    if (!res.ok) return false;
    const { seen_at } = (await res.json()) as { seen_at: string };
    return Date.now() - new Date(seen_at).getTime() < 90_000;
  } catch {
    return false;
  }
}

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
  if (!body || typeof body !== "object") return fail("send a JSON object", 400);
  // Owner switch for when model credit runs out: finished runs stay browsable.
  if (process.env.RUNS_PAUSED === "1") return fail("New runs are paused for a short while. Open any finished run on the results page", 503);

  try {
    if (body.upload) {
      const key = `inputs/${randomUUID()}.mp4`;
      return NextResponse.json({ key, uploadUrl: await signUpload(key) });
    }

    // Runs whose machine never reported back are closed out, so they cannot block the site.
    const stale = (min: number) => new Date(Date.now() - min * 60_000).toISOString();
    await patch("runs", `status=eq.queued&created_at=lt.${stale(20)}`, { status: "failed", error: "This run never started. Try again." });
    await patch("runs", `status=in.(extracting,running,waiting_user)&created_at=lt.${stale(70)}`, { status: "failed", error: "The run machine stopped before finishing." });

    const active = await rest<{ id: string }>("runs", "select=id&status=in.(queued,extracting,running,waiting_user)");
    if (active.length >= MAX_ACTIVE) return fail(`${active.length} runs are going right now. Try again in a few minutes`, 429);
    const lastHour = await rest<{ id: string }>("runs", `select=id&control_hash=not.is.null&created_at=gte.${stale(60)}`);
    if (lastHour.length >= MAX_PER_HOUR) return fail("Origin has started its limit of runs for this hour. Open a finished run on the results page, or try again later", 429);

    if (body.url) {
      const vid = youtubeId(body.url);
      if (!vid) return fail("that is not a YouTube link", 400);
      const since = new Date(Date.now() - REUSE_DAYS * 864e5).toISOString();
      const [recent] = await rest<{ id: string }>("runs", `select=id&video_id=eq.${vid}&status=in.(queued,extracting,running,done)&created_at=gte.${since}&order=created_at.desc&limit=1`);
      if (recent) return NextResponse.json({ id: recent.id, reused: true });
      const source = `https://www.youtube.com/watch?v=${vid}`;
      if (!(await ingestOnline())) return fail("the YouTube downloader is offline right now. Upload the MP4 instead", 503);
      // The ingest worker downloads it on a home connection and starts the cloud run.
      const c = control();
      const run = await write<{ id: string }>("runs", { video_id: vid, source_url: source, status: "queued", control_hash: c.hash });
      return NextResponse.json({ id: run.id, control: c.token });
    }

    if (typeof body.key === "string" && /^inputs\/[0-9a-f-]{36}\.mp4$/.test(body.key)) {
      // Only start for a file that was really uploaded and fits the limit.
      const size = await objectSize(body.key);
      if (size === null) return fail("that upload was not found. Upload the MP4 again", 400);
      if (size > MAX_UPLOAD) return fail("that file is over 50 MB", 400);
      const c = control();
      const run = await write<{ id: string }>("runs", { status: "queued", control_hash: c.hash });
      try {
        await dispatch(run.id, await signDownload(body.key, 4 * 3600), "");
      } catch (e) {
        await patch("runs", `id=eq.${run.id}`, { status: "failed", error: "Origin could not start a run machine. Try again in a few minutes." });
        throw e;
      }
      return NextResponse.json({ id: run.id, control: c.token });
    }

    return fail("paste a YouTube link or upload an MP4", 400);
  } catch (e) {
    console.error(e);
    return fail("Origin could not start this run right now. Try again in a few minutes", 502);
  }
}
