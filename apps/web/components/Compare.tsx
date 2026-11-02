"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface CBox { x1: number; y1: number; x2: number; y2: number; w: number; h: number }
interface Side { src: string; label: string; box?: CBox | null; alt: string }

const pct = (v: number, of: number) => (of > 0 ? (v / of) * 100 : 0);

function Outline({ box, now }: { box: CBox; now?: boolean }) {
  if (!(box.w > 0 && box.h > 0)) return null;
  return (
    <span
      className={`cmp-box ${now ? "now" : "then"}`}
      style={{
        left: `${pct(box.x1, box.w)}%`,
        top: `${pct(box.y1, box.h)}%`,
        width: `${pct(box.x2 - box.x1, box.w)}%`,
        height: `${pct(box.y2 - box.y1, box.h)}%`,
      }}
    />
  );
}

// Drag (or use the arrow keys) to wipe between the old video frame and today's run.
export function Compare({ then, now, ratio = "16 / 9", intro = true }: { then: Side; now: Side; ratio?: string; intro?: boolean }) {
  const [pos, setPos] = useState(50);
  const [touched, setTouched] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const fromEvent = useCallback((clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || r.width === 0) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }, []);

  // A short sweep the first time it scrolls into view, so it is obvious the frame can be dragged.
  useEffect(() => {
    if (!intro || touched) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = box.current;
    if (!el) return;
    let raf = 0, cancelled = false;
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => {
        if (cancelled) return;
        const k = Math.min(1, (t - t0) / 3600);
        setPos(50 + Math.sin(k * Math.PI * 2) * 40 * (1 - k * k));
        if (k < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.6 });
    io.observe(el);
    return () => { cancelled = true; io.disconnect(); cancelAnimationFrame(raf); };
  }, [intro, touched]);

  return (
    <div
      ref={box}
      className="cmp"
      style={{ aspectRatio: ratio }}
      onPointerDown={(e) => { dragging.current = true; setTouched(true); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); fromEvent(e.clientX); }}
      onPointerMove={(e) => { if (dragging.current) fromEvent(e.clientX); }}
      onPointerUp={() => { dragging.current = false; }}
      onPointerCancel={() => { dragging.current = false; }}
    >
      <div className="cmp-layer">
        <img src={then.src} alt={then.alt} draggable={false} />
        {then.box && <Outline box={then.box} />}
        <span className="cmp-tag then">{then.label}</span>
      </div>
      <div className="cmp-layer cmp-now" style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
        <img src={now.src} alt={now.alt} draggable={false} />
        {now.box && <Outline box={now.box} now />}
        <span className="cmp-tag now">{now.label}</span>
      </div>
      <div
        className="cmp-handle"
        style={{ left: `${pos}%` }}
        role="slider"
        tabIndex={0}
        aria-label="Compare the old video with today"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        aria-valuetext={`${Math.round(100 - pos)} percent today`}
        onKeyDown={(e) => {
          const big = e.shiftKey ? 10 : 4;
          const k = e.key;
          if (k === "ArrowLeft" || k === "ArrowDown") { e.preventDefault(); setTouched(true); setPos((p) => Math.max(0, p - big)); }
          if (k === "ArrowRight" || k === "ArrowUp") { e.preventDefault(); setTouched(true); setPos((p) => Math.min(100, p + big)); }
          if (k === "Home") { e.preventDefault(); setTouched(true); setPos(0); }
          if (k === "End") { e.preventDefault(); setTouched(true); setPos(100); }
        }}
      >
        <span className="cmp-knob" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 18 18"><path d="M6.5 4.5 2 9l4.5 4.5M11.5 4.5 16 9l-4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </div>
    </div>
  );
}
