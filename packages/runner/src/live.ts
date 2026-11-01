import { join } from "node:path";
import { select, update, uploadPrivate, removePrivate, remove, event } from "./db.js";
import type { Browser } from "./browser.js";

const ALLOWED_KEYS = new Set(["Enter", "Tab", "Backspace", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Delete"]);

/**
 * Hand the browser to the person who started the run so they can log in themselves.
 * Frames go to private storage about twice a second, readable only through the starter's token; their clicks and keys arrive in the private
 * inputs table and each row is deleted once applied. Typed text is never logged.
 */
export async function handOver(runId: string, browser: Browser, work: string, site: string, timeoutMs = 10 * 60_000): Promise<"done" | "timeout"> {
  await update("runs", `id=eq.${runId}`, { status: "waiting_user" });
  await event(runId, "login_needed", { site });
  const frame = join(work, "live.jpg");
  const start = Date.now();
  let outcome: "done" | "timeout" = "timeout";
  try {
    while (Date.now() - start < timeoutMs) {
      await browser.liveFrame(frame);
      await uploadPrivate(frame, `live/${runId}.jpg`, "image/jpeg");
      const inputs: Array<{ id: number; kind: string; payload: any }> = await select("inputs", `select=id,kind,payload&run_id=eq.${runId}&order=id`);
      for (const i of inputs) {
        if (i.kind === "click") await browser.clickAt(Number(i.payload.x), Number(i.payload.y));
        else if (i.kind === "text") await browser.typeText(String(i.payload.text ?? "").slice(0, 500));
        else if (i.kind === "key" && ALLOWED_KEYS.has(i.payload.key)) await browser.key(i.payload.key);
        else if (i.kind === "scroll") await browser.scroll(Math.max(-2000, Math.min(2000, Number(i.payload.dy) || 0)));
        else if (i.kind === "done") outcome = "done";
      }
      if (inputs.length) await remove("inputs", `run_id=eq.${runId}&id=lte.${inputs[inputs.length - 1]!.id}`);
      if (outcome === "done") break;
      await new Promise((r) => setTimeout(r, inputs.length ? 150 : 450));
    }
  } finally {
    await remove("inputs", `run_id=eq.${runId}`).catch(() => {});
    await removePrivate([`live/${runId}.jpg`]);
    await update("runs", `id=eq.${runId}`, { status: "running" });
    await event(runId, "login_finished", { outcome });
  }
  return outcome;
}
