import type { Action, Step } from "./types.js";

export function parseTimestamp(input: string): number {
  if (typeof input !== "string") throw new Error(`Invalid timestamp: ${String(input)}`);
  const m = /^(?:(\d+):)?(\d{1,2}):(\d{1,2})$/.exec(input.trim());
  if (!m) throw new Error(`Invalid timestamp: "${input}"`);
  const h = m[1] ? Number(m[1]) : 0;
  const min = Number(m[2]);
  const sec = Number(m[3]);
  if (sec > 59 || (m[1] !== undefined && min > 59)) throw new Error(`Invalid timestamp: "${input}"`);
  return h * 3600 + min * 60 + sec;
}

const ACTIONS: ReadonlySet<string> = new Set(["command", "click", "type", "setting", "navigate", "blender"]);
const ALIASES: Record<string, Action> = {
  run: "command",
  terminal: "command",
  open: "navigate",
  visit: "navigate",
  "go to": "navigate",
  goto: "navigate",
  press: "click",
  select: "click",
  enter: "type",
  input: "type",
};

function normalizeAction(a: unknown): Action | null {
  if (typeof a !== "string") return null;
  const k = a.trim().toLowerCase();
  if (ACTIONS.has(k)) return k as Action;
  return ALIASES[k] ?? null;
}

/** Every balanced, string-aware top-level [...] span in the text. */
function extractArrays(text: string): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < text.length) {
    const start = text.indexOf("[", i);
    if (start < 0) break;
    let depth = 0;
    let inStr = false;
    let esc = false;
    let end = -1;
    for (let j = start; j < text.length; j++) {
      const c = text[j]!;
      if (inStr) {
        if (esc) esc = false;
        else if (c === "\\") esc = true;
        else if (c === '"') inStr = false;
      } else if (c === '"') inStr = true;
      else if (c === "[") depth++;
      else if (c === "]") {
        depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }
    if (end < 0) break;
    out.push(text.slice(start, end + 1));
    i = end + 1;
  }
  return out;
}

function formatLabel(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function parseSparkSteps(text: string): Step[] {
  let arr: unknown[] | null = null;
  for (const c of extractArrays(text)) {
    try {
      const v: unknown = JSON.parse(c);
      if (Array.isArray(v) && v.some((x) => x && typeof x === "object")) {
        arr = v;
        break;
      }
    } catch {
      // try the next candidate
    }
  }
  if (!arr) return [];

  const items: Omit<Step, "index">[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const detail = typeof o.detail === "string" ? o.detail.trim() : "";
    if (!detail) continue;
    const action = normalizeAction(o.action);
    if (!action) continue;
    const tLabel = typeof o.t === "number" ? formatLabel(o.t) : typeof o.t === "string" ? o.t.trim() : "";
    let t: number;
    try {
      t = typeof o.t === "number" ? o.t : parseTimestamp(tLabel);
    } catch {
      continue;
    }
    const step: Omit<Step, "index"> = { t, tLabel, action, detail };
    if (typeof o.target === "string" && o.target.trim()) step.target = o.target.trim();
    if (typeof o.spoken === "boolean") step.spoken = o.spoken;
    items.push(step);
  }
  items.sort((a, b) => a.t - b.t);
  return items.map((s, index) => ({ index, ...s }));
}
