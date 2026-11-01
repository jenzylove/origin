import { rest } from "./supabase";
import type { Run, RunEvent, Step } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VIDEO = /^[A-Za-z0-9_-]{6,20}$/;

export const isUuid = (s: string) => UUID.test(s);

export async function listRuns(limit = 200): Promise<Run[]> {
  return rest<Run>("runs", `select=*&order=created_at.desc&limit=${limit}`);
}

export async function getRun(id: string): Promise<Run | null> {
  if (!UUID.test(id)) return null;
  return (await rest<Run>("runs", `select=*&id=eq.${id}`))[0] ?? null;
}

export async function getSteps(runId: string): Promise<Step[]> {
  return rest<Step>("steps", `select=*&run_id=eq.${runId}&order=idx.asc`);
}

export async function getEvents(runId: string, after = 0): Promise<RunEvent[]> {
  return rest<RunEvent>("events", `select=*&run_id=eq.${runId}&id=gt.${after}&order=id.asc&limit=2000`);
}

export async function latestDoneRun(): Promise<Run | null> {
  return (await rest<Run>("runs", "select=*&status=eq.done&order=created_at.desc&limit=1"))[0] ?? null;
}

export async function latestRunForVideo(videoId: string): Promise<Run | null> {
  if (!VIDEO.test(videoId)) return null;
  return (await rest<Run>("runs", `select=*&video_id=eq.${videoId}&order=created_at.desc&limit=1`))[0] ?? null;
}

// Verdict counts for many runs in one query.
export async function stepsByRun(runIds: string[]): Promise<Record<string, Step[]>> {
  if (!runIds.length) return {};
  const rows = await rest<Step>("steps", `select=run_id,idx,t,verdict&run_id=in.(${runIds.join(",")})&limit=5000`);
  const out: Record<string, Step[]> = {};
  for (const r of rows) (out[r.run_id] ??= []).push(r);
  return out;
}
