"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

// The one front door: a YouTube link or an MP4 upload.
export function StartBox({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [url, setUrl] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  async function send(body: BodyInit, headers?: HeadersInit) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/runs", { method: "POST", body, headers });
      const data = (await res.json().catch(() => ({}))) as { id?: string; control?: string; error?: string };
      if (res.ok && data.id) {
        if (data.control) {
          try { localStorage.setItem(`origin-control-${data.id}`, data.control); } catch { /* private mode */ }
        }
        router.push(`/run/${data.id}`);
        return;
      }
      setError(`Could not start a run: ${data.error ?? `server said ${res.status}`}.`);
    } catch {
      setError("Could not start a run: the server did not answer.");
    } finally {
      setBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return setError("Paste a YouTube link first.");
    void send(JSON.stringify({ url: url.trim() }), { "Content-Type": "application/json" });
  }

  async function picked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 50_000_000) return setError("That file is over 50 MB. Trim it or export at 480p.");
    setBusy(true);
    setError(null);
    try {
      // The video goes straight to storage; our server only signs the upload.
      const res = await fetch("/api/runs", { method: "POST", body: JSON.stringify({ upload: true }), headers: { "Content-Type": "application/json" } });
      const sign = (await res.json()) as { key?: string; uploadUrl?: string; error?: string };
      if (!res.ok || !sign.uploadUrl) throw new Error(sign.error ?? `server said ${res.status}`);
      const put = await fetch(sign.uploadUrl, { method: "PUT", body: f, headers: { "Content-Type": "video/mp4" } });
      if (!put.ok) throw new Error(`upload failed (${put.status})`);
      await send(JSON.stringify({ key: sign.key }), { "Content-Type": "application/json" });
    } catch (err) {
      setError(`Could not start a run: ${err instanceof Error ? err.message : String(err)}.`);
      setBusy(false);
    }
  }

  return (
    <div className="start">
      <form onSubmit={submit}>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste a YouTube link"
          aria-label="YouTube link"
        />
        <button className="pill pill-dark" disabled={busy}>{busy ? "Starting" : "Run it"}</button>
      </form>
      <div className="alt">
        <span>or</span>
        <button type="button" className="link-btn" onClick={() => file.current?.click()} disabled={busy}>
          upload an MP4
        </button>
        <input ref={file} type="file" accept="video/mp4" hidden onChange={picked} />
      </div>
      {error && <p className="msg-err" role="alert"><span className="msg-dot" aria-hidden="true" />{error}</p>}
    </div>
  );
}
