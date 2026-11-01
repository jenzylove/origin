import { rest } from "./supabase";
import type { Run, RunEvent, Step } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Never control_hash: the public API has no reason to return it.
const RUN_COLS = "id,video_id,source_url,title,kind,status,mode,error,summary,created_at,finished_at";
const VIDEO = /^[A-Za-z0-9_-]{6,20}$/;

export const isUuid = (s: string) => UUID.test(s);

export async function listRuns(limit = 200): Promise<Run[]> {
  return rest<Run>("runs", `select=${RUN_COLS}&order=created_at.desc&limit=${limit}`);
}

export async function getRun(id: string): Promise<Run | null> {
  if (!UUID.test(id)) return null;
  return (await rest<Run>("runs", `select=${RUN_COLS}&id=eq.${id}`))[0] ?? null;
}

// Polling skips each step's terminal output (the page streams it from events instead).
const STEP_COLS_LIGHT = "id,run_id,idx,t,t_label,action,detail,target,spoken,verdict,reasons,replacement,then_frame_url,then_box,now_shot_url,now_box";
export async function getStepsLight(runId: string): Promise<Step[]> {
  return rest<Step>("steps", `select=${STEP_COLS_LIGHT}&run_id=eq.${runId}&order=idx.asc`);
}

export async function getSteps(runId: string): Promise<Step[]> {
  return rest<Step>("steps", `select=*&run_id=eq.${runId}&order=idx.asc`);
}

export async function getEvents(runId: string, after = 0): Promise<RunEvent[]> {
  return rest<RunEvent>("events", `select=*&run_id=eq.${runId}&id=gt.${after}&order=id.asc&limit=2000`);
}

// The homepage shows a chosen run (then and now on a real tutorial), not whatever finished last.
const FEATURED_RUN = process.env.FEATURED_RUN ?? "f6d2a108-4d25-459a-bd8f-d55e1721f8ab";

export async function latestDoneRun(): Promise<Run | null> {
  const [featured] = await rest<Run>("runs", `select=${RUN_COLS}&id=eq.${FEATURED_RUN}&status=eq.done`);
  return featured ?? (await rest<Run>("runs", `select=${RUN_COLS}&status=eq.done&order=created_at.desc&limit=1`))[0] ?? null;
}

export async function latestRunForVideo(videoId: string): Promise<Run | null> {
  if (!VIDEO.test(videoId)) return null;
  return (await rest<Run>("runs", `select=${RUN_COLS}&video_id=eq.${videoId}&order=created_at.desc&limit=1`))[0] ?? null;
}

// Verdict counts for many runs in one query.
export async function stepsByRun(runIds: string[]): Promise<Record<string, Step[]>> {
  if (!runIds.length) return {};
  const rows = await rest<Step>("steps", `select=run_id,idx,t,verdict&run_id=in.(${runIds.join(",")})&limit=5000`);
  const out: Record<string, Step[]> = {};
  for (const r of rows) (out[r.run_id] ??= []).push(r);
  return out;
}
