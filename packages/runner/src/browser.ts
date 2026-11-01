import { join } from "node:path";
import { chromium, type Browser as PwBrowser, type Page } from "playwright";
import { findTarget, type Box } from "./target.js";

/** path: the screen the box was found on (for then vs now). after: the screen once the action is done. */
export interface Shot { path: string; after: string; box: Box | null; width: number; height: number; note: string }

const W = 1280, H = 720;

/** A real Chromium driven by description: SAM finds the element on today's screen, then we click it. */
export class Browser {
  private n = 0;
  private constructor(private b: PwBrowser, private page: Page, private work: string) {}

  static async create(work: string): Promise<Browser> {
    const b = await chromium.launch();
    const page = await b.newPage({ viewport: { width: W, height: H } });
    return new Browser(b, page, work);
  }

  private async shot(box: Box | null, note: string): Promise<Shot> {
    const path = join(this.work, `now_${++this.n}.jpg`);
    await this.page.screenshot({ path, type: "jpeg", quality: 70 });
    return { path, after: path, box, width: W, height: H, note };
  }

  private async settle() {
    await this.page.waitForLoadState("domcontentloaded", { timeout: 15_000 }).catch(() => {});
    await this.page.waitForTimeout(1200);
  }

  async open(url: string): Promise<Shot> {
    const res = await this.page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch((e) => e as Error);
    await this.settle();
    const status = res instanceof Error ? `failed: ${res.message.split("\n")[0]}` : `HTTP ${res?.status() ?? "?"}`;
    return this.shot(null, `opened ${this.page.url()} (${status})`);
  }

  /** Click the element matching a visual description; falls back to its visible text. */
  async click(target: string, label: string, detail: string): Promise<Shot> {
    const before = await this.shot(null, "");
    const found = await findTarget(before.path, target, detail, join(this.work, `pick_now_${this.n}.jpg`));
    if (found) {
      const sx = W / found.width, sy = H / found.height;
      const box = { x1: found.box.x1 * sx, y1: found.box.y1 * sy, x2: found.box.x2 * sx, y2: found.box.y2 * sy };
      await this.page.mouse.click((box.x1 + box.x2) / 2, (box.y1 + box.y2) / 2);
      await this.settle();
      const after = await this.shot(null, `SAM found "${target}" (${found.candidates} match${found.candidates > 1 ? "es" : ""}) and clicked it; now at ${this.page.url()}`);
      // The box belongs on the screen where it was found.
      return { ...before, box, note: after.note, after: after.path };
    }
    if (label) {
      const loc = this.page.getByText(label, { exact: false }).first();
      if (await loc.count()) {
        const bb = await loc.boundingBox();
        await loc.click({ timeout: 5000 }).catch(() => {});
        await this.settle();
        const after = await this.shot(null, `SAM saw no "${target}"; clicked the text "${label}" instead; now at ${this.page.url()}`);
        return { ...before, after: after.path, note: after.note, box: bb ? { x1: bb.x, y1: bb.y, x2: bb.x + bb.width, y2: bb.y + bb.height } : null };
      }
    }
    return { ...before, note: `Not found on today's page: no "${target}"${label ? ` and no text "${label}"` : ""}.` };
  }

  /** Find an element on the current page without clicking it. */
  async locate(target: string, detail: string): Promise<Shot> {
    const shot = await this.shot(null, "");
    const found = await findTarget(shot.path, target, detail, join(this.work, `pick_loc_${this.n}.jpg`));
    if (!found) return { ...shot, note: `Not on today's page: no "${target}".` };
    const sx = W / found.width, sy = H / found.height;
    return { ...shot, box: { x1: found.box.x1 * sx, y1: found.box.y1 * sy, x2: found.box.x2 * sx, y2: found.box.y2 * sy }, note: `Today's "${target}"` };
  }

  async type(target: string, text: string, detail: string): Promise<Shot> {
    const clicked = await this.click(target, "", detail);
    if (!clicked.box) return clicked;
    await this.page.keyboard.type(text, { delay: 20 });
    return this.shot(clicked.box, `typed into "${target}"`);
  }

  async key(key: string): Promise<Shot> {
    await this.page.keyboard.press(key);
    await this.settle();
    return this.shot(null, `pressed ${key}; now at ${this.page.url()}`);
  }

  async close() { await this.b.close().catch(() => {}); }
}
