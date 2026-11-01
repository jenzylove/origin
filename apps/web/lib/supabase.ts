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
