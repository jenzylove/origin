import { dataUrl } from "./meta.js";
import { need } from "./env.js";

/** Muse Spark Open (Meta open weights) on Baseten: a vision question about one image. */
export async function openVision(imagePath: string, question: string): Promise<string> {
  const res = await fetch("https://inference.baseten.co/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Api-Key ${need("BASETEN_API_KEY")}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "meta-models/muse-spark-open",
      max_tokens: 1500,
      messages: [{ role: "user", content: [
        { type: "text", text: question },
        { type: "image_url", image_url: { url: dataUrl(imagePath, "image/jpeg") } },
      ] }],
    }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Spark Open ${res.status}: ${text.slice(0, 300)}`);
  const msg = JSON.parse(text).choices?.[0]?.message ?? {};
  return String(msg.content ?? "");
}
