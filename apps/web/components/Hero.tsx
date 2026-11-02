"use client";

import { useEffect, useRef } from "react";

// Two hands reach for each other across the call to action. The left hand is drawn with the
// commands old tutorials teach; the right hand with the fixes Origin actually ran today.
// Silhouettes are traced from Michelangelo's Creation of Adam (public domain).
const OLD = "npx create-react-app my-app  npm install -g webpack webpack-cli  npx tailwindcss init  @tailwind base;  ng new my-app --service-worker  node 14.17.5  npm run start  ";
const NEW = "npm create vite@latest my-app -- --template react  npm i -D webpack webpack-cli  @import \"tailwindcss\";  ng add @angular/pwa  node 24 LTS  npm run dev  ";
const CYCLE = 6500;
const RAMP = " .:-=+*#%@";

interface Cell { x: number; y: number; v: number; i: number; edge: number }
interface Hand { cells: Cell[]; tip: { x: number; y: number } }

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = src; });
}

/** Sample a hand mask into a grid of character cells placed on the canvas. */
function cellsFor(img: HTMLImageElement, x0: number, y0: number, w: number, cw: number, ch: number, fadeFromLeft: boolean): Cell[] {
  const h = (w * img.height) / img.width;
  const cols = Math.max(4, Math.round(w / cw)), rows = Math.max(3, Math.round(h / ch));
  const c = document.createElement("canvas");
  c.width = cols; c.height = rows;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.drawImage(img, 0, 0, cols, rows);
  const d = g.getImageData(0, 0, cols, rows).data;
  const out: Cell[] = [];
  let n = 0;
  for (let r = 0; r < rows; r++) {
    for (let k = 0; k < cols; k++) {
      const v = d[(r * cols + k) * 4]! / 255;
      if (v < 0.12) continue;
      const t = k / (cols - 1);
      out.push({ x: x0 + k * cw, y: y0 + r * ch, v, i: n++, edge: fadeFromLeft ? t : 1 - t });
    }
  }
  return out;
}

/** Scatter characters beyond the arm's cut end so it dissolves toward the edge of the frame. */
function dissolve(from: Cell[], towardX: number, ch: number, cw: number, seed: number): Cell[] {
  if (!from.length) return [];
  const xs = from.map((c) => c.x);
  const edgeX = towardX > from[0]!.x ? Math.max(...xs) : Math.min(...xs);
  const rim = from.filter((c) => Math.abs(c.x - edgeX) < cw * 1.5);
  const out: Cell[] = [];
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const span = Math.abs(towardX - edgeX);
  for (const c of rim) {
    for (let step = 1; step * cw < span; step++) {
      const t = (step * cw) / span;
      if (rnd() > 0.9 - t * 0.85) continue;
      out.push({ x: edgeX + Math.sign(towardX - edgeX) * step * cw, y: c.y + (rnd() - 0.5) * ch * 2 * t, v: c.v * (1 - t), i: c.i + step, edge: 1 - t });
    }
  }
  return out;
}

export function Hero() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cv = canvas.current, box = wrap.current;
    const hero = box?.parentElement;
    if (!cv || !box || !hero) return;
    const ctx = cv.getContext("2d")!;
    let alive = true, raf = 0, visible = true, start = performance.now();
    let left: Hand | null = null, right: Hand | null = null;
    let font = "", W = 0, H = 0, mobile = false, dpr = 1;
    let imgs: [HTMLImageElement, HTMLImageElement] | null = null;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const dark = window.matchMedia("(prefers-color-scheme: dark)");

    const layout = () => {
      if (!imgs) return;
      const r = hero.getBoundingClientRect();
      W = r.width; H = r.height; dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      cv.style.width = `${W}px`; cv.style.height = `${H}px`;
      mobile = W < 760;
      const pill = hero.querySelector(".hero-copy .pill")?.getBoundingClientRect();
      const px = pill ? pill.left - r.left + pill.width / 2 : W / 2;
      const py = pill ? pill.top - r.top + pill.height / 2 : H * 0.6;
      const cw = mobile ? 4 : 5.4, ch = mobile ? 6.2 : 8.4;
      font = `600 ${mobile ? 6.4 : 8.8}px "Geist Mono", ui-monospace, monospace`;
      const [L, R] = imgs;
      // Fingertips sit either side of the button, at its height (below it on phones).
      const gap = mobile ? 26 : (pill?.width ?? 180) / 2 + 46;
      const tipY = mobile ? py + 120 : py + 36;
      const lw = mobile ? W * 0.7 : Math.min(W * 0.6, 980);
      const lh = (lw * L.height) / L.width;
      const lx = px - gap - lw, ly = tipY - lh * 0.36; // Adam's index finger: right edge, a third down
      const rw = ((lw * R.width) / L.width) * 1.06;
      const rh = (rw * R.height) / R.width;
      const rx = px + gap, ry = tipY - rh * 0.42; // the pointing finger: left edge
      const lc = cellsFor(L, lx, ly, lw, cw, ch, true);
      const rc = cellsFor(R, rx, ry, rw, cw, ch, false);
      left = { cells: [...dissolve(lc, 0, ch, cw, 7), ...lc], tip: { x: px - gap, y: tipY } };
      right = { cells: [...rc, ...dissolve(rc, W, ch, cw, 11)], tip: { x: px + gap, y: tipY } };
    };

    const draw = (now: number) => {
      if (!left || !right) return;
      const still = reduce.matches;
      const t = still ? 0.35 : ((now - start) % CYCLE) / CYCLE;
      const breathe = still ? 0 : Math.sin(((now - start) / CYCLE) * Math.PI * 2) * (mobile ? 2 : 5);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.font = font;
      ctx.textBaseline = "top";
      const ink = dark.matches ? [242, 242, 239] : [17, 17, 17];
      const warm = dark.matches ? [205, 178, 132] : [128, 98, 58];
      const tick = Math.floor((now - start) / 140);

      // Density characters give the sculpted form; a few cells shimmer so the hands feel alive.
      const paint = (hand: Hand, _text: string, rgb: number[], dx: number, flash: number) => {
        for (const c of hand.cells) {
          const jitter = !still && (c.i * 7 + tick) % 23 === 0 ? 1 : 0;
          const ch = RAMP[Math.min(RAMP.length - 1, Math.max(1, Math.round(c.v * (RAMP.length - 1)) - jitter))]!;

          const glow = flash * clamp(1 - Math.hypot(c.x - hand.tip.x, c.y - hand.tip.y) / 90);
          const a = clamp((0.55 + c.v * 0.45) * (0.2 + c.edge * 0.8));
          ctx.fillStyle = glow > 0.05 ? `rgba(47,182,124,${clamp(a + glow)})` : `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
          ctx.fillText(ch, c.x + dx, c.y);
        }
      };

      // A spark crosses the gap from the old hand to the new one, and today's fingertip lights up.
      const travel = clamp((t - 0.45) / 0.18);
      const arrive = clamp(1 - Math.abs(t - 0.68) / 0.12);
      paint(left, OLD, warm, breathe, clamp(1 - Math.abs(t - 0.42) / 0.06) * 0.6);
      paint(right, NEW, ink, -breathe, arrive);
      ctx.font = `${mobile ? 10 : 12}px "Geist Mono", ui-monospace, monospace`;
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = `rgba(${warm[0]},${warm[1]},${warm[2]},0.9)`;
      ctx.textAlign = "right";
      ctx.fillText(mobile ? "2021: npx create-react-app" : "2021 tutorial:  npx create-react-app my-app", left.tip.x - 8, left.tip.y + (mobile ? 70 : 150));
      ctx.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},0.85)`;
      ctx.textAlign = "left";
      ctx.fillText(mobile ? "today: npm create vite" : "Origin, today:  npm create vite@latest", right.tip.x + (mobile ? 8 : 60), right.tip.y + (mobile ? 92 : 150));
      ctx.textAlign = "start";
      if (travel > 0 && travel < 1 && !still) {
        const x0 = left.tip.x + breathe, x1 = right.tip.x - breathe;
        const x = x0 + (x1 - x0) * travel;
        const y = left.tip.y - Math.sin(travel * Math.PI) * 10;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 16);
        g.addColorStop(0, "rgba(47,182,124,0.95)");
        g.addColorStop(1, "rgba(47,182,124,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, 16, 0, Math.PI * 2); ctx.fill();
      }
    };

    const loop = (now: number) => {
      if (!alive) return;
      if (visible) draw(now);
      if (!reduce.matches) raf = requestAnimationFrame(loop);
    };

    const ro = new ResizeObserver(() => { layout(); draw(performance.now()); });
    const io = new IntersectionObserver(([e]) => { visible = !!e?.isIntersecting; });
    Promise.all([load("/hero/hand-left.png"), load("/hero/hand-right.png"), document.fonts?.ready]).then(([L, R]) => {
      if (!alive) return;
      imgs = [L as HTMLImageElement, R as HTMLImageElement];
      layout();
      box.classList.add("is-ready");
      start = performance.now();
      ro.observe(hero); io.observe(hero);
      raf = requestAnimationFrame(loop);
    }).catch(() => {});
    const restart = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(loop); };
    reduce.addEventListener("change", restart);
    dark.addEventListener("change", restart);
    return () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      reduce.removeEventListener("change", restart); dark.removeEventListener("change", restart);
    };
  }, []);

  return (
    <div className="hero-art" ref={wrap}>
      <canvas ref={canvas} role="img" aria-label="Two hands made of text reach for each other: the left is drawn with old tutorial commands, the right with the fixes Origin ran today, and a spark crosses between them." />
    </div>
  );
}
