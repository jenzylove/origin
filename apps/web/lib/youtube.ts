// Mirrors youtubeId in @origin/core, kept local so the web app has no build step on it.
export function youtubeId(input: string): string | null {
  let u: URL;
  try { u = new URL(/^https?:\/\//.test(input) ? input : `https://${input}`); } catch { return null; }
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0] ?? null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id = u.searchParams.get("v") ?? /^\/(?:shorts|embed|live)\/([^/?#]+)/.exec(u.pathname)?.[1] ?? null;
  }
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}
