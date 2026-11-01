// Queue benchmark tutorials as runs. The home ingest downloads each and starts it unattended.
// Usage: node scripts/bench.mjs [kind] [limit]
import { readFileSync } from "node:fs";
const env = Object.fromEntries(readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
const [kind, limit] = process.argv.slice(2);
const list = JSON.parse(readFileSync(new URL("../docs/benchmark/candidates.json", import.meta.url), "utf8"))
  .filter((c) => !kind || kind === "all" || c.kind === kind)
  .slice(0, Number(limit) || 999);
const h = { apikey: env.SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.SUPABASE_SECRET_KEY}`, "Content-Type": "application/json", Prefer: "return=representation" };
for (const c of list) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/runs`, { method: "POST", headers: h, body: JSON.stringify({ video_id: c.id, source_url: c.url, status: "queued" }) });
  const [run] = await res.json();
  console.log(`${c.kind}\t${c.id}\t${run?.id ?? "FAILED"}`);
}
