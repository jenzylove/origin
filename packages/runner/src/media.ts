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

export const BOX_COLORS = ["red", "blue", "yellow", "magenta", "cyan", "white"] as const;

/** Outline each candidate box in its own color so a vision model can name one. */
export function drawBoxes(image: string, boxes: Array<{ x1: number; y1: number; x2: number; y2: number }>, out: string): string {
  const filters = boxes.map((b, i) => `drawbox=x=${b.x1 - 3}:y=${b.y1 - 3}:w=${b.x2 - b.x1 + 6}:h=${b.y2 - b.y1 + 6}:color=${BOX_COLORS[i]}:t=3`);
  ff(["-i", image, "-vf", filters.join(","), out]);
  return out;
}
