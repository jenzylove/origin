import { readFileSync } from "node:fs";
import { need } from "./env.js";

const headers = () => {
  const key = need("SUPABASE_SECRET_KEY");
  return { apikey: key, Authorization: `Bearer ${key}` };
};
const url = (p: string) => need("SUPABASE_URL") + p;

async function rest(method: string, path: string, body?: unknown, prefer = "return=representation"): Promise<any> {
  const res = await fetch(url("/rest/v1/" + path), {
    method,
    headers: { ...headers(), "Content-Type": "application/json", Prefer: prefer },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${path} ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

export const insert = (table: string, row: object) => rest("POST", table, row).then((r) => r[0]);
export const update = (table: string, match: string, patch: object) => rest("PATCH", `${table}?${match}`, patch);
export const select = (table: string, query: string) => rest("GET", `${table}?${query}`);

export async function event(runId: string, kind: string, payload: object = {}): Promise<void> {
  await rest("POST", "events", { run_id: runId, kind, payload }, "return=minimal");
}

/** Upload to the public media bucket and return its public URL. */
export async function upload(localPath: string, key: string, contentType: string): Promise<string> {
  const res = await fetch(url(`/storage/v1/object/media/${key}`), {
    method: "POST",
    headers: { ...headers(), "Content-Type": contentType, "x-upsert": "true" },
    body: readFileSync(localPath),
    signal: AbortSignal.timeout(120_000),
  });
  if (!res.ok) throw new Error(`Upload ${key} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return url(`/storage/v1/object/public/media/${key}`);
}

export async function remove(table: string, match: string): Promise<void> {
  await rest("DELETE", `${table}?${match}`, undefined, "return=minimal");
}
