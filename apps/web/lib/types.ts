export type Verdict = "pending" | "running" | "works" | "changed" | "broken" | "gated" | "skipped";
export type RunStatus = "queued" | "extracting" | "running" | "waiting_user" | "done" | "failed";

export interface Box { x1: number; y1: number; x2: number; y2: number; w: number; h: number }

export interface Run {
  id: string;
  video_id: string | null;
  source_url: string | null;
  title: string | null;
  kind: string | null;
  status: RunStatus;
  mode: string;
  error: string | null;
  summary: {
    counts?: Record<string, number>;
    final?: { then_url: string; now_url: string; match: "yes" | "partly" | "no"; note: string };
  } | null;
  created_at: string;
  finished_at: string | null;
}

export interface Step {
  id: string;
  run_id: string;
  idx: number;
  t: number;
  t_label: string;
  action: string;
  detail: string;
  target: string | null;
  spoken: boolean | null;
  verdict: Verdict | null;
  reasons: string[] | null;
  replacement: string | null;
  output: string | null;
  then_frame_url: string | null;
  then_box: Box | null;
  now_shot_url: string | null;
  now_box: Box | null;
}

export interface RunEvent {
  id: number;
  run_id: string;
  at: string;
  kind: string;
  payload: Record<string, unknown>;
}

export const isFinished = (s: RunStatus) => s === "done" || s === "failed";
