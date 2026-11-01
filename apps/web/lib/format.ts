import type { Run, Step, Verdict } from "./types";

export const VERDICTS: Verdict[] = ["works", "changed", "broken", "gated"];

export function countVerdicts(steps: Pick<Step, "verdict">[]): Record<string, number> {
  const c: Record<string, number> = {};
  for (const s of steps) {
    const v = s.verdict ?? "pending";
    c[v] = (c[v] ?? 0) + 1;
  }
  return c;
}

// Video length is not stored, so use the last step plus 30 seconds.
export function tapeDuration(steps: Pick<Step, "t">[]): number {
  return Math.max(60, ...steps.map((s) => Number(s.t))) + 30;
}

export function statusLabel(run: Pick<Run, "status">): string {
  return {
    queued: "Queued",
    extracting: "Extracting",
    running: "Running",
    waiting_user: "Waiting for you",
    done: "Done",
    failed: "Failed",
  }[run.status];
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function runName(run: Pick<Run, "title" | "source_url" | "id">): string {
  return run.title || run.source_url || `Run ${run.id.slice(0, 8)}`;
}

export function youtubeStart(t: number): number {
  return Math.max(0, Math.floor(t));
}
