/**
 * YouTube ingest, run on a home connection (YouTube refuses data centre IPs).
 * Picks up queued YouTube runs, downloads the video, stores it, and starts the cloud run.
 * Writes a heartbeat so the site can say when it is offline.
 */
import "./env.js";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { select, update, event, upload, uploadPrivate, signedUrl } from "./db.js";

const REPO = process.env.GITHUB_REPO ?? "jenzylove/origin";
const PYTHON = process.env.PYTHON ?? "python";
const claimed = new Set<string>();

async function heartbeat(dir: string) {
  const p = join(dir, "ingest.json");
  writeFileSync(p, JSON.stringify({ seen_at: new Date().toISOString() }));
  await upload(p, "status/ingest.json", "application/json");
}

async function handle(run: { id: string; source_url: string; control_hash: string | null }) {
  claimed.add(run.id);
  try {
    await download(run);
  } catch (e) {
    console.error(`ingest ${run.id}: ${e}`);
    await update("runs", `id=eq.${run.id}`, { status: "failed", error: "Origin could not start this run. Try again, or upload the MP4.", finished_at: new Date().toISOString() }).catch(() => {});
  }
}

async function download(run: { id: string; source_url: string; control_hash: string | null }) {
  const dir = mkdtempSync(join(tmpdir(), "origin-ingest-"));
  const out = join(dir, "input.mp4");
  await event(run.id, "download_start", {});
  try {
    // Async with a time limit, so the heartbeat keeps beating during a download.
    await promisify(execFile)(PYTHON, ["-m", "yt_dlp", "-q", "--no-playlist", "-S", "res:480,ext:mp4", "--merge-output-format", "mp4",
      "--match-filter", "duration<=2400", "-o", out, run.source_url], { timeout: 600_000 });
  } catch { /* reported below */ }
  if (!existsSync(out)) {
    await update("runs", `id=eq.${run.id}`, { status: "failed", error: "This video is longer than 40 minutes, private, or could not be downloaded. Upload the MP4 instead.", finished_at: new Date().toISOString() });
    rmSync(dir, { recursive: true, force: true });
    return;
  }
  // The video stays private; the run machine gets a link that expires.
  await uploadPrivate(out, `inputs/${run.id}.mp4`, "video/mp4");
  const videoUrl = await signedUrl(`inputs/${run.id}.mp4`, 4 * 3600);
  await event(run.id, "download_done", {});
  execFileSync("gh", ["workflow", "run", "run.yml", "-R", REPO, "-f", `run_id=${run.id}`, "-f", `video_url=${videoUrl}`, "-f", `source_url=${run.source_url}`,
    // Runs started from the site have a control token and a person watching; batch runs do not.
    "-f", `unattended=${run.control_hash ? "0" : "1"}`], { stdio: "inherit" });
  // Out of the queue now, so a restarted ingest never starts the same run twice.
  await update("runs", `id=eq.${run.id}&status=eq.queued`, { status: "extracting" });
  rmSync(dir, { recursive: true, force: true });
  console.log(`dispatched ${run.id}`);
}

async function loop() {
  const dir = mkdtempSync(join(tmpdir(), "origin-hb-"));
  const beat = () => heartbeat(dir).catch((e) => console.error(`heartbeat: ${e}`));
  await beat();
  setInterval(beat, 30_000);
  for (;;) {
    try {
      const since = new Date(Date.now() - 60 * 60_000).toISOString();
      const runs = await select("runs", `select=id,source_url,control_hash&status=eq.queued&video_id=not.is.null&created_at=gte.${since}&order=created_at`);
      for (const r of runs) if (!claimed.has(r.id)) await handle(r);
    } catch (e) {
      console.error(String(e));
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
}

console.log("Origin ingest running");
loop();
