import { execFileSync } from "node:child_process";
import { statSync } from "node:fs";

const ff = (args: string[]) => execFileSync("ffmpeg", ["-v", "error", "-y", ...args], { stdio: ["ignore", "ignore", "pipe"] });

export function duration(video: string): number {
  return Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video]).toString().trim());
}

/** Inline requests are capped at 50 MB, so large videos are re-encoded small. */
export function forSpark(video: string, out: string): string {
  if (statSync(video).size < 40_000_000) return video;
  ff(["-i", video, "-vf", "scale=-2:480", "-r", "8", "-c:v", "libx264", "-crf", "32", "-preset", "veryfast", "-c:a", "aac", "-b:a", "48k", out]);
  return out;
}

export function frameAt(video: string, seconds: number, out: string): string {
  ff(["-ss", String(Math.max(0, seconds)), "-i", video, "-frames:v", "1", "-q:v", "3", out]);
  return out;
}

/** 16 kHz mono WAV chunks of at most 9.5 minutes (Transcribe takes 10 minutes max). */
export function audioChunks(video: string, prefix: string): string[] {
  const total = duration(video);
  const size = 570;
  const out: string[] = [];
  for (let start = 0, i = 0; start < total; start += size, i++) {
    const p = `${prefix}_${i}.wav`;
    ff(["-ss", String(start), "-t", String(size), "-i", video, "-vn", "-ac", "1", "-ar", "16000", "-sample_fmt", "s16", p]);
    out.push(p);
  }
  return out;
}
