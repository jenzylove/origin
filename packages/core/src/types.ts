export type Action = "command" | "click" | "type" | "setting" | "navigate" | "blender";

export interface Step {
  index: number;
  /** seconds */
  t: number;
  /** timestamp as given, e.g. "02:40" */
  tLabel: string;
  action: Action;
  detail: string;
  /** visual description of a click target, for SAM */
  target?: string;
  spoken?: boolean;
}

export type Verdict = "works" | "changed" | "broken" | "gated" | "skipped";

export interface Grade {
  verdict: Verdict;
  reasons: string[];
}
