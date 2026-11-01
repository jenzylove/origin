/**
 * YouTube ingest, run on a home connection (YouTube refuses data centre IPs).
 * Picks up queued YouTube runs, downloads the video, stores it, and starts the cloud run.
 * Writes a heartbeat so the site can say when it is offline.
 */
import "./env.js";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { select, update, event, upload } from "./db.js";

const REPO = process.env.GITHUB_REPO ?? "jenzylove/origin";
const PYTHON = process.env.PYTHON ?? "python";
const claimed = new Set<string>();

async function heartbeat(dir: string) {
  const p = join(dir, "ingest.json");
  writeFileSync(p, JSON.stringify({ seen_at: new Date().toISOString() }));
  await upload(p, "status/ingest.json", "application/json");
}

async function handle(run: { id: string; source_url: string }) {
  claimed.add(run.id);
  const dir = mkdtempSync(join(tmpdir(), "origin-ingest-"));
  const out = join(dir, "input.mp4");
  await event(run.id, "download_start", {});
  try {
    execFileSync(PYTHON, ["-m", "yt_dlp", "-q", "--no-playlist", "-S", "res:480,ext:mp4", "--merge-output-format", "mp4",
      "--match-filter", "duration<=2400", "-o", out, run.source_url], { stdio: "inherit" });
  } catch { /* reported below */ }
  if (!existsSync(out)) {
    await update("runs", `id=eq.${run.id}`, { status: "failed", error: "This video is longer than 40 minutes, private, or could not be downloaded. Upload the MP4 instead.", finished_at: new Date().toISOString() });
    rmSync(dir, { recursive: true, force: true });
    return;
  }
  const videoUrl = await upload(out, `inputs/${run.id}.mp4`, "video/mp4");
  await event(run.id, "download_done", {});
  execFileSync("gh", ["workflow", "run", "run.yml", "-R", REPO, "-f", `run_id=${run.id}`, "-f", `video_url=${videoUrl}`, "-f", `source_url=${run.source_url}`], { stdio: "inherit" });
  rmSync(dir, { recursive: true, force: true });
  console.log(`dispatched ${run.id}`);
}

async function loop() {
  const dir = mkdtempSync(join(tmpdir(), "origin-hb-"));
  let beat = 0;
  for (;;) {
    try {
      if (Date.now() - beat > 30_000) { await heartbeat(dir); beat = Date.now(); }
      const since = new Date(Date.now() - 60 * 60_000).toISOString();
      const runs = await select("runs", `select=id,source_url&status=eq.queued&video_id=not.is.null&created_at=gte.${since}&order=created_at`);
      for (const r of runs) if (!claimed.has(r.id)) await handle(r);
    } catch (e) {
      console.error(String(e));
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
}

console.log("Origin ingest running");
loop();
