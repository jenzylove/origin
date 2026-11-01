import "./env.js";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { insert, update, event, upload, removePrivate } from "./db.js";
import { extract } from "./extract.js";
import { sparkCompare, usage } from "./meta.js";
import { makeCards, type CardStep } from "./cards.js";
import { duration, frameAt } from "./media.js";
import { runSteps } from "./agent.js";
import { Browser } from "./browser.js";
import { DockerSandbox, LocalSandbox, type Sandbox } from "./sandbox.js";

const { values: args } = parseArgs({ options: {
  "run-id": { type: "string" },
  video: { type: "string" },        // local MP4 path
  "video-url": { type: "string" },  // MP4 URL, e.g. an upload in the media bucket
  "source-url": { type: "string" }, // the tutorial's page, shown to users
  sandbox: { type: "string", default: "docker" },
} });

const MAX_VIDEO_BYTES = 200_000_000;

async function fetchVideo(url: string, work: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(300_000) });
  if (!res.ok) throw new Friendly("Origin could not fetch the video. Try again, or upload the MP4.", `Video download ${res.status}`);
  if (Number(res.headers.get("content-length") ?? 0) > MAX_VIDEO_BYTES) throw new Friendly("This video file is too large.", "too large");
  const path = join(work, "input.mp4");
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

/** An error with a message fit for the public run page; the raw cause goes to the log only. */
class Friendly extends Error {
  constructor(public readonly friendly: string, cause: string) { super(cause); }
}

function friendlyError(e: unknown): string {
  if (e instanceof Friendly) return e.friendly;
  const raw = String(e);
  if (/payload_too_large|413/.test(raw)) return "This video is too large for Origin to watch. Try a shorter clip or a smaller MP4.";
  if (/Meta .*(429|5\d\d)|timeout|aborted/i.test(raw)) return "Meta's model service did not answer in time. Try this run again in a few minutes.";
  if (/Unexpected token|JSON/.test(raw)) return "Origin could not read the steps from this video. Try again, or try another tutorial.";
  return "Origin hit an error and stopped this run. The steps checked so far are kept.";
}

// The private video this run used, so it can be deleted when the run ends.
function privateKey(url: string | undefined): string | null {
  const m = url ? /\/object\/sign\/private\/([^?]+)/.exec(url) : null;
  return m ? decodeURIComponent(m[1]!) : null;
}

function fetchYouTube(url: string, work: string): string {
  const out = join(work, "input.mp4");
  try {
    execFileSync("yt-dlp", ["-q", "--no-playlist", "-S", "res:480,ext:mp4", "--merge-output-format", "mp4", "--match-filter", "duration<=2400", "-o", out, url], { stdio: "inherit" });
  } catch { /* reported below */ }
  if (!existsSync(out)) throw new Friendly("This video is longer than 40 minutes, or YouTube refused the download. Upload the MP4 instead.", "yt-dlp failed");
  return out;
}

async function main() {
  const work = mkdtempSync(join(tmpdir(), "origin-run-"));
  const runId: string = args["run-id"] ?? (await insert("runs", { source_url: args["source-url"] ?? null, status: "queued" })).id;
  const emit = (kind: string, payload: object) => event(runId, kind, payload);
  console.log(`run ${runId}`);

  let sb: Sandbox | null = null;
  try {
    const source = args["source-url"] ?? "";
    const video = args.video
      ?? (args["video-url"] ? await fetchVideo(args["video-url"], work) : null)
      ?? (/youtu\.?be/.test(source) ? fetchYouTube(source, work) : null);
    if (!video) throw new Friendly("No video was given.", "no video");

    await update("runs", `id=eq.${runId}`, { status: "extracting" });
    await emit("extract_start", {});
    const ex = await extract(video, work);
    await emit("extract_done", { kind: ex.kind, title: ex.title, steps: ex.steps.length });

    for (const s of ex.steps) {
      const target = ex.targets.get(s.index);
      const thenUrl = target ? await upload(target.frame, `${runId}/then_${s.index}.jpg`, "image/jpeg") : null;
      await insert("steps", {
        run_id: runId, idx: s.index, t: s.t, t_label: s.tLabel, action: s.action, detail: s.detail,
        target: s.target ?? null, then_frame_url: thenUrl,
        then_box: target ? { ...target.box, w: target.width, h: target.height } : null,
      });
    }
    await update("runs", `id=eq.${runId}`, { title: ex.title, kind: ex.kind, status: "running" });

    if (ex.kind === "unsupported") {
      // Phone apps, hardware and anything else Origin cannot run: say so plainly.
      await update("runs", `id=eq.${runId}`, { status: "failed", error: `Origin cannot run this tutorial. ${ex.why}`.trim(), finished_at: new Date().toISOString() });
      return;
    }

    sb = args.sandbox === "local" ? new LocalSandbox() : await DockerSandbox.create();
    const context = `Tutorial: ${ex.title}. ${ex.steps.length} steps follow, one at a time.\nNarration (for context): ${ex.transcript.slice(0, 4000)}`;
    const counts: Record<string, number> = {};
    const graded: CardStep[] = [];
    const { lastRender } = await runSteps(ex.steps, context, sb, work, () => Browser.create(work), emit, runId, async (step, r) => {
      counts[r.verdict] = (counts[r.verdict] ?? 0) + 1;
      graded.push({ index: step.index, tLabel: step.tLabel, verdict: r.verdict, detail: step.detail, replacement: r.replacement, reason: r.reasons[0] ?? "" });
      const png = r.now?.path.endsWith(".png");
      const nowUrl = r.now ? await upload(r.now.path, `${runId}/now_${step.index}.${png ? "png" : "jpg"}`, png ? "image/png" : "image/jpeg") : null;
      await update("steps", `run_id=eq.${runId}&idx=eq.${step.index}`, {
        verdict: r.verdict, reasons: r.reasons, replacement: r.replacement ?? null, output: r.output,
        now_shot_url: nowUrl, now_box: r.now?.box ? { ...r.now.box, w: r.now.width, h: r.now.height } : null,
      });
      await emit("step_done", { index: step.index, verdict: r.verdict });
      console.log(`step ${step.index + 1} ${r.verdict}: ${r.reasons[0]}`);
    });

    // Blender: does today's rebuild match the tutorial's final result?
    let final: object | undefined;
    if (ex.kind === "blender" && lastRender) {
      try {
        const at = ex.resultT ?? Math.max(0, duration(video) - 3);
        const endFrame = frameAt(video, at, join(work, "final_then.jpg"));
        const cmp = await sparkCompare(endFrame, lastRender, ex.title);
        final = {
          then_url: await upload(endFrame, `${runId}/final_then.jpg`, "image/jpeg"),
          now_url: await upload(lastRender, `${runId}/final_now.png`, "image/png"),
          ...cmp,
        };
        await emit("final_compare", cmp);
      } catch (e) { console.warn(`final compare: ${e}`); }
    }
    // Creator cards for every step that changed or broke (Muse Image).
    const cards = await makeCards(runId, graded, work).catch(() => ({}));
    await update("runs", `id=eq.${runId}`, { status: "done", summary: { counts, usage: ex.usage, tokens: { ...usage }, final, cards }, finished_at: new Date().toISOString() });
    await emit("run_done", { counts });
  } catch (e) {
    console.error(e);
    await update("runs", `id=eq.${runId}`, { status: "failed", error: friendlyError(e), summary: { tokens: { ...usage } }, finished_at: new Date().toISOString() }).catch(() => {});
    await emit("run_failed", { error: friendlyError(e) }).catch(() => {});
    process.exitCode = 1;
  } finally {
    await sb?.close();
    // The tutorial video is never kept: only frames and results stay.
    const key = privateKey(args["video-url"]);
    if (key) await removePrivate([key]);
  }
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
