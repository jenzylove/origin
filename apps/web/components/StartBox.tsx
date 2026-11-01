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
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (res.ok && data.id) {
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

  function picked(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const form = new FormData();
    form.append("file", f);
    void send(form);
    e.target.value = "";
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
        <button className="btn" disabled={busy}>{busy ? "Starting" : "Run it"}</button>
      </form>
      <div className="alt">
        <span>or</span>
        <button type="button" className="link-btn" onClick={() => file.current?.click()} disabled={busy}>
          upload an MP4
        </button>
        <input ref={file} type="file" accept="video/mp4" hidden onChange={picked} />
      </div>
      {error && <p className="msg-err" role="alert">{error}</p>}
    </div>
  );
}
