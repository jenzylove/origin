import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { museImage } from "./meta.js";
import { upload } from "./db.js";

export interface CardStep { index: number; tLabel: string; verdict: string; detail: string; replacement?: string; reason: string }

// Quotes would break the prompt; long text is cut at a word, never mid word.
const clean = (s: string, n: number) => {
  const t = s.replace(/["'`]/g, "").replace(/\s+/g, " ").trim();
  return t.length <= n ? t : t.slice(0, t.lastIndexOf(" ", n)).replace(/[,;:]$/, "");
};
// A reason reads best on a slide as its first clause.
const firstClause = (s: string) => s.split(/[;.](\s|$)/)[0] ?? s;

/** A slide a creator can pin under their video: the step, then and today, drawn by Muse Image. */
function prompt(s: CardStep, checked: string): string {
  const head = s.verdict === "broken" ? "This step is broken today" : "This step changed";
  const today = s.replacement ? clean(s.replacement, 90) : clean(firstClause(s.reason), 80);
  return `A clean dark slide for a YouTube pinned fix, flat design, deep near-black background (#0D0D0B), warm cream text (#F1ECE2).
Top left small mono label: 'ORIGIN · STEP ${s.index + 1} AT ${s.tLabel}'. Big headline: '${head}'.
Row 1 label in amber 'THEN' with monospace text: '${clean(s.detail, 90)}'.
Row 2 label in green 'TODAY' with ${s.replacement ? "monospace " : ""}text: '${today}'.
Bottom small text: 'Checked ${checked} on today's software'. Exact text only, no other words, no logos.`;
}

export async function makeCards(runId: string, steps: CardStep[], work: string): Promise<Record<number, string>> {
  const checked = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
  const out: Record<number, string> = {};
  for (const s of steps.filter((x) => x.verdict === "changed" || x.verdict === "broken").slice(0, 8)) {
    try {
      const path = join(work, `card_${s.index}.png`);
      writeFileSync(path, await museImage(prompt(s, checked)));
      out[s.index] = await upload(path, `${runId}/card_${s.index}.png`, "image/png");
    } catch (e) {
      console.warn(`card ${s.index}: ${e}`);
    }
  }
  return out;
}
