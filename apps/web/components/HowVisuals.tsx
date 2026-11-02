"use client";

import { useEffect, useRef, useState } from "react";

// Starts once, when the element is first on screen. Reduced motion skips straight to the end.
function useInView<T extends Element>(): [React.RefObject<T | null>, boolean, boolean] {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView, reduced];
}

// Watch: frames sampled from the 2021 video, sliding past like a filmstrip.
const CROPS = ["0% 0%", "38% 42%", "70% 46%", "45% 58%", "100% 100%"];
export function WatchVisual() {
  const frames = [...CROPS, ...CROPS];
  return (
    <div className="v-watch" aria-label="Frames sampled from the 2021 video" role="img">
      <div className="v-watch-track">
        {frames.map((p, i) => (
          <span key={i} className="v-frame" style={{ backgroundPosition: p, backgroundSize: i % 5 === 0 || i % 5 === 4 ? "100% 100%" : "260% 260%" }} />
        ))}
      </div>
      <span className="v-scan" aria-hidden="true" />
    </div>
  );
}

// Point: SAM's outline drawing itself on the button the video clicked.
export function PointVisual() {
  return (
    <div className="v-point" role="img" aria-label="The 2021 frame with the clicked button outlined">
      <img src="/hero/then.jpg" alt="" loading="lazy" />
      <span className="v-point-box" style={{ left: `${(234 / 640) * 100}%`, top: `${(163 / 360) * 100}%`, width: `${(80 / 640) * 100}%`, height: `${(26 / 360) * 100}%` }} />
    </div>
  );
}

// Run: the real terminal lines from the featured run, typed out.
const LINES = [
  { t: "$ npx create-react-app my-first-react-app --use-npm", c: "cmd" },
  { t: "create-react-app is deprecated.", c: "warn" },
  { t: "Success! Created my-first-react-app", c: "out" },
  { t: "Verdict: changed, still runs but is retired", c: "verdict" },
];
export function RunVisual() {
  const [ref, inView, reduced] = useInView<HTMLDivElement>();
  const [n, setN] = useState(0); // characters typed across all lines
  const total = LINES.reduce((a, l) => a + l.t.length, 0);
  useEffect(() => {
    if (!inView) return;
    if (reduced) { setN(total); return; }
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setN(i);
      if (i >= total + 70) { i = 0; }
    }, 28);
    return () => clearInterval(id);
  }, [inView, reduced, total]);
  let left = Math.min(n, total);
  return (
    <div className="v-run" ref={ref} aria-label={LINES.map((l) => l.t).join(". ")} role="img">
      {LINES.map((l, i) => {
        const shown = Math.max(0, Math.min(l.t.length, left));
        left -= l.t.length;
        const typing = shown > 0 && shown < l.t.length;
        return (
          <div key={i} className={`v-run-ln ${l.c}`} style={{ opacity: shown > 0 ? 1 : 0 }}>
            {l.t.slice(0, shown)}
            {typing && <span className="caret" />}
          </div>
        );
      })}
    </div>
  );
}

// Repair: today's way, kept only because it ran.
export function RepairVisual() {
  const [ref, inView] = useInView<HTMLDivElement>();
  return (
    <div className={`v-repair ${inView ? "go" : ""}`} ref={ref}>
      <span className="v-repair-lab">Today&apos;s way</span>
      <code>npm create vite@latest my-app -- --template react</code>
      <span className="v-check" aria-label="Ran and kept">
        <svg viewBox="0 0 24 24" width="22" height="22"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        <span>Ran, kept</span>
      </span>
    </div>
  );
}

export function CountUp({ value }: { value: number }) {
  const [ref, inView, reduced] = useInView<HTMLSpanElement>();
  const [v, setV] = useState(value);
  useEffect(() => {
    if (!inView || reduced) { setV(value); return; }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 1400);
      setV(Math.round(value * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    setV(0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduced, value]);
  return <span ref={ref}>{v.toLocaleString("en-US")}</span>;
}
