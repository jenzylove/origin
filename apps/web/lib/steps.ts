import type { Step } from "./types";

const VERDICT_WORD: Record<string, string> = {
  works: "Works", changed: "Changed", broken: "Broken", gated: "Needs login", skipped: "Skipped", pending: "Waiting", running: "Running",
};
export const verdictWord = (v: string) => VERDICT_WORD[v] ?? v;

/** The step in plain words: commands stay as commands, everything else reads as a sentence. */
export function plainStep(step: Pick<Step, "action" | "detail">): { text: string; code: boolean } {
  const first = (step.detail ?? "").split("\n")[0]!.trim();
  if (step.action === "command" || step.action === "type") return { text: first, code: true };
  if (step.action === "navigate") {
    try {
      const u = new URL(first);
      const where = u.hostname.replace(/^www\./, "") || u.pathname.split("/").filter(Boolean).pop() || first;
      return { text: `Open ${where}`, code: false };
    } catch { /* not a URL */ }
  }
  if (step.action === "click" && first && !/^click/i.test(first)) return { text: `Click “${first}”`, code: false };
  return { text: first, code: false };
}

/** Reasons a person reads; automatic output checks go behind "Show what ran". */
export function splitReasons(reasons: string[] | null) {
  const all = Array.isArray(reasons) ? reasons : [];
  return { said: all.filter((r) => !r.startsWith("Output check:")), checks: all.filter((r) => r.startsWith("Output check:")) };
}
