import { readFileSync } from "node:fs";
import { need } from "./env.js";

const base = () => process.env.META_API_BASE ?? "https://api.meta.ai/v1";
const auth = () => ({ Authorization: `Bearer ${need("META_API_KEY")}` });

/** Tokens Spark used during this process, so every run can record its real cost. */
export const usage = { input: 0, output: 0 };

// Retries rate limits, server errors and dropped connections; every call has a time limit.
async function postJson(path: string, body: unknown): Promise<any> {
  const payload = JSON.stringify(body);
  let last = "";
  for (let attempt = 0; attempt < 4; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 2000 * 2 ** attempt));
    try {
      const res = await fetch(base() + path, {
        method: "POST",
        headers: { ...auth(), "Content-Type": "application/json" },
        body: payload,
        signal: AbortSignal.timeout(240_000),
      });
      const text = await res.text();
      if (res.ok) {
        const json = JSON.parse(text);
        usage.input += json.usage?.input_tokens ?? json.usage?.prompt_tokens ?? 0;
        usage.output += json.usage?.output_tokens ?? json.usage?.completion_tokens ?? 0;
        return json;
      }
      last = `Meta ${path} ${res.status}: ${text.slice(0, 300)}`;
      if (res.status !== 429 && res.status < 500) break;
    } catch (e) {
      last = `Meta ${path}: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  throw new Error(last);
}

export function dataUrl(path: string, mime: string): string {
  return `data:${mime};base64,${readFileSync(path).toString("base64")}`;
}

/** Text output of a Responses API call. */
export function outputText(resp: any): string {
  for (const item of resp.output ?? []) {
    if (item.type !== "message") continue;
    for (const c of item.content ?? []) if (c.type === "output_text") return c.text ?? "";
  }
  return "";
}

/** Muse Spark watches a video (MP4, under 50 MB inline) with a text prompt. */
export async function sparkVideo(videoPath: string, prompt: string): Promise<{ text: string; usage: any }> {
  const resp = await postJson("/responses", {
    model: "muse-spark-1.3",
    // Meta stores Responses by default and refuses to store large ones; we never need them back.
    store: false,
    input: [{ type: "message", role: "user", content: [
      { type: "input_text", text: prompt },
      { type: "input_video", video_url: dataUrl(videoPath, "video/mp4") },
    ] }],
  });
  return { text: outputText(resp), usage: resp.usage };
}

export interface ChatMessage { role: "system" | "user" | "assistant" | "tool"; content: any; tool_calls?: any[]; tool_call_id?: string }

export async function sparkChat(messages: ChatMessage[], tools?: unknown[]): Promise<{ message: ChatMessage; usage: any }> {
  const resp = await postJson("/chat/completions", { model: "muse-spark-1.3", messages, ...(tools ? { tools } : {}) });
  const message = resp.choices?.[0]?.message;
  if (!message) throw new Error("Meta chat returned no message");
  return { message, usage: resp.usage };
}

/** SAM 3.1 on one image with a short descriptive phrase. Returns raw SAM text. */
export async function samImage(imagePath: string, phrase: string): Promise<string> {
  const resp = await postJson("/responses", {
    model: "sam-3.1",
    store: false,
    input: [{ type: "message", role: "user", content: [
      { type: "input_text", text: phrase },
      { type: "input_image", image_url: dataUrl(imagePath, imagePath.endsWith(".png") ? "image/png" : "image/jpeg") },
    ] }],
  });
  return outputText(resp);
}

/** Muse Voice Transcribe on a 16 kHz mono WAV of at most 10 minutes. */
export async function transcribe(wavPath: string): Promise<string> {
  const form = new FormData();
  form.append("request", new Blob([JSON.stringify({ model: "muse-voice-transcribe-1.0", audioEncoding: "WAV", mode: "PUSH_TO_TALK" })], { type: "application/json" }));
  form.append("audio", new Blob([readFileSync(wavPath)], { type: "audio/wav" }), "audio.wav");
  const res = await fetch(base() + "/asr/transcribe", { method: "POST", headers: { ...auth(), Accept: "application/json" }, body: form });
  const text = await res.text();
  if (!res.ok) throw new Error(`Transcribe ${res.status}: ${text.slice(0, 300)}`);
  return JSON.parse(text).transcript ?? "";
}

/** Spark compares two images: the tutorial's result and today's. */
export async function sparkCompare(thenPath: string, nowPath: string, what: string): Promise<{ match: "yes" | "partly" | "no"; note: string }> {
  const { message } = await sparkChat([{ role: "user", content: [
    { type: "text", text: `Image 1 is the final result shown in a tutorial (${what}). Image 2 is the result rebuilt today by following its steps. Compare the objects and shapes, not lighting, color or camera angle. Reply only JSON: {"match": "yes" | "partly" | "no", "note": "one plain sentence naming what matches and what differs"}` },
    { type: "image_url", image_url: { url: dataUrl(thenPath, "image/jpeg") } },
    { type: "image_url", image_url: { url: dataUrl(nowPath, nowPath.endsWith(".png") ? "image/png" : "image/jpeg") } },
  ] }]);
  const text = String(message.content ?? "");
  const obj = JSON.parse(text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  return { match: obj.match, note: obj.note };
}

/** Muse Image: one PNG from a prompt. Returns the image bytes. */
export async function museImage(prompt: string, size = "1600x900"): Promise<Buffer> {
  const resp = await postJson("/images/generations", { model: "muse-image-1.0", n: 1, size, output_format: "png", prompt });
  return Buffer.from(resp.data[0].b64_json, "base64");
}
