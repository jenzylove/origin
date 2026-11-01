const ID = /^[A-Za-z0-9_-]{11}$/;

export function youtubeId(url: string): string | null {
  const raw = (url ?? "").trim();
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    try {
      u = new URL("https://" + raw);
    } catch {
      return null;
    }
  }
  const host = u.hostname.toLowerCase().replace(/^(www|m|music)\./, "");
  const parts = u.pathname.split("/").filter(Boolean);
  let id: string | null | undefined;
  if (host === "youtu.be") id = parts[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (parts[0] === "watch") id = u.searchParams.get("v");
    else if (["shorts", "embed", "live", "v"].includes(parts[0] ?? "")) id = parts[1];
  }
  return id && ID.test(id) ? id : null;
}
