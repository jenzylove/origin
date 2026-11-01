import { join } from "node:path";
import { parseSparkSteps, parseSamOutput, type Step } from "@origin/core";
import { sparkVideo, transcribe, samImage } from "./meta.js";
import { audioChunks, forSpark, frameAt } from "./media.js";

export type Kind = "code" | "web" | "blender" | "account" | "unsupported";

export interface TargetBox { frame: string; box: { x1: number; y1: number; x2: number; y2: number }; width: number; height: number }

export interface Extraction {
  title: string;
  kind: Kind;
  why: string;
  transcript: string;
  steps: Step[];
  targets: Map<number, TargetBox | null>;
  usage: unknown;
}

const PROMPT = (transcript: string) => `You are watching a software tutorial so that every step can be re-run today.

Return ONLY a JSON object:
{
  "title": "short title of what the tutorial builds",
  "kind": "code" | "web" | "blender" | "account" | "unsupported",
  "why": "one sentence: why this kind, or why it cannot be run (phone app, hardware)",
  "steps": [
    { "t": "mm:ss", "action": "command" | "click" | "type" | "setting" | "navigate" | "blender",
      "detail": "the exact command, URL, text typed, or setting value; for click, what is clicked",
      "target": "for click only: a short visual description of the clicked element as it looks on screen, e.g. 'green download button', 'blue Sign in button', 'File menu'" }
  ]
}

Rules:
- kind "code" = terminal and code editor work; "web" = done by clicking through a website; "blender" = Blender; "account" = ends by posting, publishing or paying from the user's own account.
- Include every step the viewer must perform, in order, with the time it is shown. Include steps that are only spoken, using the narration below.
- Copy commands and code exactly as shown on screen, including versions.
- Version requirements said aloud ("you need at least Node 14") are steps of action "setting".

Narration transcript (no timestamps):
"""${transcript.slice(0, 20000)}"""`;

export async function extract(video: string, work: string): Promise<Extraction> {
  const chunks = audioChunks(video, join(work, "audio"));
  const parts: string[] = [];
  for (const c of chunks) {
    try { parts.push(await transcribe(c)); } catch (e) { parts.push(""); console.warn(String(e)); }
  }
  const transcript = parts.join(" ").trim();

  const { text, usage } = await sparkVideo(forSpark(video, join(work, "small.mp4")), PROMPT(transcript));
  const obj = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  const steps = parseSparkSteps(JSON.stringify(obj.steps ?? []));

  const targets = new Map<number, TargetBox | null>();
  for (const s of steps) {
    if (s.action !== "click" || !s.target) continue;
    const frame = frameAt(video, s.t + 1, join(work, `then_${s.index}.jpg`));
    const frames = parseSamOutput(await samImage(frame, s.target));
    const o = frames[0]?.objects[0];
    targets.set(s.index, o ? { frame, box: o.box, width: o.width, height: o.height } : null);
  }
  return { title: obj.title ?? "", kind: obj.kind ?? "unsupported", why: obj.why ?? "", transcript, steps, targets, usage };
}
