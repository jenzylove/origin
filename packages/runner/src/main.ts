import "./env.js";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { insert, update, select, event, upload } from "./db.js";
import { extract } from "./extract.js";
import { sparkCompare } from "./meta.js";
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

async function fetchVideo(url: string, work: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Video download ${res.status}`);
  const path = join(work, "input.mp4");
  writeFileSync(path, Buffer.from(await res.arrayBuffer()));
  return path;
}

function fetchYouTube(url: string, work: string): string {
  const out = join(work, "input.mp4");
  try {
    execFileSync("yt-dlp", ["-q", "--no-playlist", "-S", "res:480,ext:mp4", "--merge-output-format", "mp4", "--match-filter", "duration<=2400", "-o", out, url], { stdio: "inherit" });
  } catch { /* reported below */ }
  if (!existsSync(out)) throw new Error("This video is longer than 40 minutes, or YouTube refused the download. Upload the MP4 instead.");
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
    if (!video) throw new Error("No video given");

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
      // Other runners land in later phases; say so instead of pretending.
      await update("runs", `id=eq.${runId}`, { status: "failed", error: `The ${ex.kind} runner is not live yet. ${ex.why}`, finished_at: new Date().toISOString() });
      return;
    }

    sb = args.sandbox === "local" ? new LocalSandbox() : await DockerSandbox.create();
    const context = `Tutorial: ${ex.title}. ${ex.steps.length} steps follow, one at a time.\nNarration (for context): ${ex.transcript.slice(0, 4000)}`;
    const counts: Record<string, number> = {};
    const { lastRender } = await runSteps(ex.steps, context, sb, work, () => Browser.create(work), emit, runId, async (step, r) => {
      counts[r.verdict] = (counts[r.verdict] ?? 0) + 1;
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
    await update("runs", `id=eq.${runId}`, { status: "done", summary: { counts, usage: ex.usage, final }, finished_at: new Date().toISOString() });
    await emit("run_done", { counts });
  } catch (e) {
    console.error(e);
    await update("runs", `id=eq.${runId}`, { status: "failed", error: String(e).slice(0, 500), finished_at: new Date().toISOString() });
    await emit("run_failed", { error: String(e).slice(0, 500) });
    process.exitCode = 1;
  } finally {
    await sb?.close();
  }
}

void select; // used by later phases (resume, replay)
main();
