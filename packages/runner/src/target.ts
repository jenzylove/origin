import { parseSamOutput } from "@origin/core";
import { samImage } from "./meta.js";
import { drawBoxes, BOX_COLORS } from "./media.js";
import { openVision } from "./open.js";

export interface Box { x1: number; y1: number; x2: number; y2: number }
export interface Found { box: Box; width: number; height: number; candidates: number }

/**
 * SAM finds every element matching the phrase; several can look alike (two green download
 * buttons). Muse Spark Open looks at the candidates, outlined in distinct colors, and
 * picks the one the step means.
 */
async function pickBox(image: string, boxes: Box[], detail: string, out: string): Promise<number> {
  const shown = boxes.slice(0, BOX_COLORS.length);
  drawBoxes(image, shown, out);
  const legend = shown.map((_, i) => BOX_COLORS[i]).join(", ");
  try {
    const answer = await openVision(out, `Several elements are outlined in these colors: ${legend}. Which color outlines the element for this tutorial step: "${detail}"? Reply with only the color name.`);
    const i = shown.findIndex((_, k) => answer.toLowerCase().includes(BOX_COLORS[k]!));
    return i >= 0 ? i : 0;
  } catch (e) {
    console.warn(`pickBox: ${e}`);
    return 0;
  }
}

/** Locate the element a step means on an image: SAM by description, Spark Open to disambiguate. */
export async function findTarget(image: string, phrase: string, detail: string, pickPath: string): Promise<Found | null> {
  const objects = parseSamOutput(await samImage(image, phrase))[0]?.objects ?? [];
  if (!objects.length) return null;
  const o = objects.length > 1 ? objects[await pickBox(image, objects.map((x) => x.box), detail, pickPath)]! : objects[0]!;
  return { box: o.box, width: o.width, height: o.height, candidates: objects.length };
}
