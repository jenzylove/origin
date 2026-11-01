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

/** Private bucket: the user's video, and live frames of a logged in browser. Never public. */
export async function uploadPrivate(localPath: string, key: string, contentType: string): Promise<void> {
  const res = await fetch(url(`/storage/v1/object/private/${key}`), {
    method: "POST",
    headers: { ...headers(), "Content-Type": contentType, "x-upsert": "true" },
    body: readFileSync(localPath),
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`Upload ${key} ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

/** A time limited link to a private file. */
export async function signedUrl(key: string, seconds = 7200): Promise<string> {
  const res = await fetch(url(`/storage/v1/object/sign/private/${key}`), {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: seconds }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`Sign ${key} ${res.status}`);
  return url(`/storage/v1${((await res.json()) as { signedURL: string }).signedURL}`);
}

export async function removePrivate(keys: string[]): Promise<void> {
  await fetch(url("/storage/v1/object/private"), {
    method: "DELETE",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: keys }),
    signal: AbortSignal.timeout(30_000),
  }).catch(() => {});
}
