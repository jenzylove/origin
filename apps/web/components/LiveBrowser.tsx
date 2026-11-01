"use client";

import { useEffect, useRef, useState } from "react";

const W = 1280, H = 720;
const KEYS = ["Enter", "Tab", "Backspace", "Escape"];

// The run's real browser, streamed. The person who started the run logs in here themselves.
export function LiveBrowser({ runId, frameUrl, site }: { runId: string; frameUrl: string; site: string }) {
  const [control, setControl] = useState<string | null>(null);
  const [src, setSrc] = useState(`${frameUrl}?t=0`);
  const [text, setText] = useState("");
  const [hide, setHide] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => {
    try { setControl(localStorage.getItem(`origin-control-${runId}`)); } catch { setControl(null); }
  }, [runId]);

  // Preload each new frame before swapping, so the view never flickers to blank.
  useEffect(() => {
    let alive = true;
    const tick = () => {
      const next = `${frameUrl}?t=${Date.now()}`;
      const pre = new Image();
      pre.onload = () => { if (alive) setSrc(next); };
      pre.src = next;
    };
    const t = setInterval(tick, 700);
    tick();
    return () => { alive = false; clearInterval(t); };
  }, [frameUrl]);

  async function send(kind: string, payload: object = {}) {
    if (!control) return;
    setError(null);
    const res = await fetch(`/api/runs/${runId}/input`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ control, kind, payload }),
    }).catch(() => null);
    if (!res?.ok) setError(((await res?.json().catch(() => null)) as { error?: string } | null)?.error ?? "That did not reach the browser. Try again.");
  }

  function click(e: React.MouseEvent<HTMLImageElement>) {
    const r = img.current!.getBoundingClientRect();
    void send("click", { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H });
  }

  if (!control) {
    return (
      <section className="live">
        <div className="eyebrow">Waiting for a login</div>
        <p>This step needs an account on {site || "a site"}. Only the person who started this run can log in. Origin carries on when they do, or marks the step skipped after 10 minutes.</p>
        <div className="shot"><img src={src} alt="The run's browser right now" /></div>
      </section>
    );
  }

  return (
    <section className="live">
      <div className="eyebrow">Your turn: log in to {site || "the site"}</div>
      <p>This is Origin&apos;s real browser. Click on it and type below to log in yourself. What you type goes straight to this browser; Origin never stores or logs it. Origin will still stop before anything is published, paid, deleted or sent.</p>
      <div className="shot live-view">
        <img ref={img} src={src} alt="Live browser" onClick={click} />
      </div>
      <form className="live-type" onSubmit={(e) => { e.preventDefault(); if (text) { void send("text", { text }); setText(""); } }}>
        <input type={hide ? "password" : "text"} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type into the clicked field" autoComplete="off" aria-label="Text to type" />
        <button type="button" className="link-btn" onClick={() => setHide(!hide)}>{hide ? "show" : "hide"}</button>
        <button className="btn">Type it</button>
      </form>
      <div className="live-keys">
        {KEYS.map((k) => <button key={k} type="button" className="link-btn" onClick={() => void send("key", { key: k })}>{k}</button>)}
        <button type="button" className="link-btn" onClick={() => void send("scroll", { dy: 500 })}>Scroll down</button>
        <button type="button" className="link-btn" onClick={() => void send("scroll", { dy: -500 })}>Scroll up</button>
        <button type="button" className="btn" onClick={() => void send("done")}>I&apos;m logged in, carry on</button>
      </div>
      {error && <p className="msg-err" role="alert">{error}</p>}
    </section>
  );
}
