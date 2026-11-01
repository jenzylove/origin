// Server only. The secret key never reaches the browser.
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

export async function rest<T>(table: string, query = ""): Promise<T[]> {
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are not set");
  const res = await fetch(`${url}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase ${table} ${res.status}`);
  return (await res.json()) as T[];
}

export async function write<T>(table: string, row: object): Promise<T> {
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are not set");
  const res = await fetch(`${url}/rest/v1/${table}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(row),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase insert ${table} ${res.status}`);
  return ((await res.json()) as T[])[0]!;
}

/** A one time URL the browser can upload a file to, without sending it through our server. Private bucket. */
export async function signUpload(path: string): Promise<string> {
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are not set");
  const res = await fetch(`${url}/storage/v1/object/upload/sign/private/${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase sign upload ${res.status}`);
  const { url: signed } = (await res.json()) as { url: string };
  return `${url}/storage/v1${signed}`;
}

export const publicUrl = (path: string) => `${url}/storage/v1/object/public/media/${path}`;

export async function patch(table: string, match: string, row: object): Promise<void> {
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are not set");
  const res = await fetch(`${url}/rest/v1/${table}?${match}`, {
    method: "PATCH",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase update ${table} ${res.status}`);
}

/** Size in bytes of a private file, or null when it does not exist. */
export async function objectSize(path: string): Promise<number | null> {
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are not set");
  const res = await fetch(`${url}/storage/v1/object/info/private/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
  if (!res.ok) return null;
  const info = (await res.json()) as { size?: number; metadata?: { size?: number } };
  return Number(info.size ?? info.metadata?.size ?? 0);
}

/** A time limited download link to a private file, for the run machine. */
export async function signDownload(path: string, seconds: number): Promise<string> {
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are not set");
  const res = await fetch(`${url}/storage/v1/object/sign/private/${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: seconds }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase sign ${res.status}`);
  return `${url}/storage/v1${((await res.json()) as { signedURL: string }).signedURL}`;
}

/** Fetch a private file with the server key (used to relay live frames to the run's starter). */
export async function readPrivate(path: string): Promise<Response> {
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are not set");
  return fetch(`${url}/storage/v1/object/private/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: "no-store" });
}
