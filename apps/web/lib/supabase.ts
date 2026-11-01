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

/** A one time URL the browser can upload a file to, without sending it through our server. */
export async function signUpload(path: string): Promise<string> {
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY are not set");
  const res = await fetch(`${url}/storage/v1/object/upload/sign/media/${path}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Supabase sign upload ${res.status}`);
  const { url: signed } = (await res.json()) as { url: string };
  return `${url}/storage/v1${signed}`;
}

export const publicUrl = (path: string) => `${url}/storage/v1/object/public/media/${path}`;
