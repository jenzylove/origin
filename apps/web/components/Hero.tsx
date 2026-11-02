"use client";

import { useEffect, useRef } from "react";

// The hero plays Origin's core moment on a real run: the 2021 frame dissolves into characters,
// today's page resolves out of characters into the real screenshot, and SAM's outlines land.
const RAMP = " .:-=+*#%@";
const LOOP = 9000;
// SAM 3.1 boxes from the featured run, as fractions of each frame.
const THEN_BOX = { x1: 234 / 640, y1: 163 / 360, x2: 314 / 640, y2: 189 / 360 };
const NOW_BOX = { x1: 112 / 1280, y1: 408 / 720, x2: 511 / 1280, y2: 453 / 720 };

interface Side {
  x: number; y: number; w: number; h: number;
  cols: number; rows: number; cw: number; ch: number;
  dens: Float32Array; seed: Float32Array;
}
interface Layout { W: number; H: number; mobile: boolean; left: Side; right: Side; font: string; capFont: string }

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (v: number) => { const x = clamp(v); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const smooth = (a: number, b: number, v: number) => { const x = clamp((v - a) / (b - a)); return x * x * (3 - 2 * x); };

function densities(img: HTMLImageElement, cols: number, rows: number): Float32Array {
  const c = document.createElement("canvas");
  c.width = cols; c.height = rows;
  const g = c.getContext("2d", { willReadFrequently: true })!;
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = "high";
  g.drawImage(img, 0, 0, cols, rows);
  const px = g.getImageData(0, 0, cols, rows).data;
  const lum = new Float32Array(cols * rows);
  for (let i = 0; i < lum.length; i++) lum[i] = (0.2126 * px[i * 4]! + 0.7152 * px[i * 4 + 1]! + 0.0722 * px[i * 4 + 2]!) / 255;
  // Darkness alone turns big flat areas into slabs; edges keep the page's structure readable.
  const out = new Float32Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c, l = lum[i]!;
      const gx = Math.abs((lum[i + (c < cols - 1 ? 1 : 0)] ?? l) - (lum[i - (c > 0 ? 1 : 0)] ?? l));
      const gy = Math.abs((lum[i + (r < rows - 1 ? cols : 0)] ?? l) - (lum[i - (r > 0 ? cols : 0)] ?? l));
      const edge = Math.min(1, (gx + gy) * 2.2);
      out[i] = clamp((1 - l) * 0.5 + edge * 0.85 - 0.04);
    }
  }
  return out;
}

function seeds(n: number, salt: number): Float32Array {
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) { const v = Math.sin((i + 1) * 12.9898 + salt * 78.233) * 43758.5453; s[i] = v - Math.floor(v); }
  return s;
}

export function Hero() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = canvas.current!, host = wrap.current!;
    const ctx = el.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let thenImg: HTMLImageElement | null = null, nowImg: HTMLImageElement | null = null;
    let L: Layout | null = null;
    let nowLayer: HTMLCanvasElement | null = null, thenLayer: HTMLCanvasElement | null = null;
    let colors = { ink: "#111", grey: "#8A8A86", then: "#E8A33D", now: "#2FB67C" };
    let raf = 0, visible = true, start = performance.now(), dpr = 1;

    const readColors = () => {
      const cs = getComputedStyle(host);
      colors = {
        ink: cs.getPropertyValue("--ascii").trim() || colors.ink,
        grey: cs.getPropertyValue("--grey").trim() || colors.grey,
        then: cs.getPropertyValue("--changed").trim() || colors.then,
        now: cs.getPropertyValue("--works").trim() || colors.now,
      };
    };

    const layout = () => {
      if (!thenImg || !nowImg) return;
      const W = host.clientWidth;
      const mobile = W < 760;
      const imgW = mobile ? W * 0.84 : W * 0.42;
      const imgH = imgW * 9 / 16;
      const cap = mobile ? 34 : 40;
      const gapY = mobile ? 30 : 0;
      const cols = mobile ? 78 : Math.round(clamp(imgW / 5.6, 80, 130));
      const cw = imgW / cols, ch = cw * 1.6;
      const rows = Math.floor(imgH / ch);
      const make = (x: number, y: number, img: HTMLImageElement, salt: number): Side => ({
        x, y, w: imgW, h: imgH, cols, rows, cw, ch, dens: densities(img, cols, rows), seed: seeds(cols * rows, salt),
      });
      const left = make(-W * (mobile ? 0.07 : 0.04), 0, thenImg, 1);
      const right = make(mobile ? W - imgW + W * 0.07 : W * 0.62, mobile ? imgH + cap + gapY : 0, nowImg, 2);
      const H = mobile ? right.y + imgH + cap : imgH + cap;
      const monoFamily = getComputedStyle(host).getPropertyValue("--font-mono").trim() || "monospace";
      L = { W, H, mobile, left, right, font: `500 ${(ch * 0.98).toFixed(2)}px ${monoFamily}`, capFont: `500 ${mobile ? 11 : 12}px ${monoFamily}` };
      dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = Math.round(W * dpr); el.height = Math.round(H * dpr);
      el.style.height = `${H}px`;
      // Today's screenshot, with its centre side feathered so it reaches in like the old frame.
      nowLayer = document.createElement("canvas");
      nowLayer.width = Math.round(imgW * dpr); nowLayer.height = Math.round(imgH * dpr);
      const g = nowLayer.getContext("2d")!;
      g.drawImage(nowImg, 0, 0, nowLayer.width, nowLayer.height);
      g.globalCompositeOperation = "destination-in";
      const grad = g.createLinearGradient(0, 0, nowLayer.width * 0.16, 0);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,1)");
      g.fillStyle = grad;
      g.fillRect(0, 0, nowLayer.width, nowLayer.height);
      // A faint ghost of the real 2021 frame under its characters, fading toward the centre.
      thenLayer = document.createElement("canvas");
      thenLayer.width = nowLayer.width; thenLayer.height = nowLayer.height;
      const h = thenLayer.getContext("2d")!;
      h.filter = window.matchMedia("(prefers-color-scheme: dark)").matches ? "sepia(0.35) saturate(0.7) brightness(0.8)" : "sepia(0.35) saturate(0.7)";
      h.drawImage(thenImg, 0, 0, thenLayer.width, thenLayer.height);
      h.filter = "none";
      h.globalCompositeOperation = "destination-in";
      const fade = h.createLinearGradient(0, 0, thenLayer.width, 0);
      fade.addColorStop(0, "rgba(0,0,0,1)");
      fade.addColorStop(0.5, "rgba(0,0,0,0.9)");
      fade.addColorStop(0.85, "rgba(0,0,0,0)");
      h.fillStyle = fade;
      h.fillRect(0, 0, thenLayer.width, thenLayer.height);
    };

    const strokeProgress = (x: number, y: number, w: number, h: number, p: number, color: string, lw: number) => {
      if (p <= 0) return;
      const per = 2 * (w + h);
      let left = per * clamp(p);
      ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x, y);
      const segs: [number, number, number][] = [[w, 1, 0], [h, 0, 1], [w, -1, 0], [h, 0, -1]];
      let cx = x, cy = y;
      for (const [len, dx, dy] of segs) {
        const d = Math.min(len, left);
        cx += dx * d; cy += dy * d; ctx.lineTo(cx, cy);
        left -= d; if (left <= 0) break;
      }
      ctx.stroke();
    };

    const caption = (text: string, x: number, y: number, align: "left" | "right", color: string, a: number) => {
      ctx.globalAlpha = a;
      ctx.font = L!.capFont; ctx.textBaseline = "middle"; ctx.textAlign = align;
      const tw = ctx.measureText(text).width;
      const dotX = align === "left" ? x + 4 : x - tw - 14;
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(dotX, y, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = colors.grey;
      ctx.fillText(text, align === "left" ? x + 16 : x, y);
      ctx.textAlign = "left";
    };

    const draw = (t: number) => {
      if (!L || !nowLayer) return;
      const { left: A, right: B } = L;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, L.W, L.H);
      ctx.font = L.font; ctx.textBaseline = "top"; ctx.fillStyle = colors.ink;

      // Then: characters dissolve and drift toward the centre, from the centre side inward.
      const back = smooth(8200, 9000, t);
      const dis = ease((t - 700) / 3800) * (1 - back);
      const front = dis * 0.46;
      if (thenLayer) {
        ctx.globalAlpha = 0.5 * (1 - dis * 0.6);
        ctx.drawImage(thenLayer, A.x, A.y, A.w, A.h);
      }
      for (let r = 0; r < A.rows; r++) {
        for (let c = 0; c < A.cols; c++) {
          const i = r * A.cols + c, d = A.dens[i]!;
          if (d < 0.06) continue;
          const s = A.seed[i]!, nx = c / A.cols;
          const fromCentre = L.mobile ? 1 - nx : 1 - nx;
          if (nx > 0.72 && s < (nx - 0.72) / 0.28) continue; // ragged reach, like fingertips
          const a = clamp((front + (s - 0.5) * 0.18 - fromCentre) / 0.1);
          const alpha = (0.32 + 0.6 * d) * (1 - a);
          if (alpha < 0.02) continue;
          const g = RAMP[Math.max(1, Math.min(9, Math.round(d * 9 * (1 - a * 0.7))))]!;
          const dx = a * a * (30 + s * 140);
          const dy = Math.sin(s * 40 + t / 700) * a * 8;
          ctx.globalAlpha = alpha;
          ctx.fillText(g, A.x + c * A.cw + dx, A.y + r * A.ch + dy);
        }
      }

      // Today: characters arrive from the centre, settle, then give way to the real screenshot.
      const fadeOut = 1 - smooth(8200, 8800, t);
      const img = ease((t - 3500) / 1400);
      for (let r = 0; r < B.rows; r++) {
        for (let c = 0; c < B.cols; c++) {
          const i = r * B.cols + c, d = B.dens[i]!;
          if (d < 0.05) continue;
          const s = B.seed[i]!, nx = c / B.cols;
          const ta = 600 + nx * 1700 + s * 700;
          const k = clamp((t - ta) / 550);
          if (k <= 0) continue;
          const keep = 1 - img * smooth(0.03, 0.15, nx);
          const alpha = (0.3 + 0.6 * d) * k * keep * fadeOut;
          if (alpha < 0.02) continue;
          const settled = k >= 1;
          const g = settled ? RAMP[Math.max(1, Math.min(9, Math.round(d * 9)))]! : RAMP[1 + Math.floor(((s * 997 + t / 60) % 9))]!;
          const dx = -(1 - ease(k)) * (50 + s * 90);
          ctx.globalAlpha = alpha;
          ctx.fillText(g, B.x + c * B.cw + dx, B.y + r * B.ch);
        }
      }
      if (img > 0) {
        ctx.globalAlpha = img * fadeOut;
        ctx.drawImage(nowLayer, B.x, B.y, B.w, B.h);
      }

      // SAM outlines: amber on the old button, green on today's.
      const tb = { x: A.x + THEN_BOX.x1 * A.w - 3, y: A.y + THEN_BOX.y1 * A.h - 3, w: (THEN_BOX.x2 - THEN_BOX.x1) * A.w + 6, h: (THEN_BOX.y2 - THEN_BOX.y1) * A.h + 6 };
      ctx.globalAlpha = 1 - back;
      strokeProgress(tb.x, tb.y, tb.w, tb.h, ease((t - 300) / 900), colors.then, 2);
      const nb = { x: B.x + NOW_BOX.x1 * B.w - 4, y: B.y + NOW_BOX.y1 * B.h - 4, w: (NOW_BOX.x2 - NOW_BOX.x1) * B.w + 8, h: (NOW_BOX.y2 - NOW_BOX.y1) * B.h + 8 };
      const np = ease((t - 5000) / 900);
      ctx.globalAlpha = fadeOut;
      strokeProgress(nb.x, nb.y, nb.w, nb.h, np, colors.now, 2.5);
      if (np >= 1) {
        const pulse = (Math.sin((t - 5900) / 260) + 1) / 2;
        ctx.globalAlpha = fadeOut * 0.25 * pulse;
        ctx.strokeStyle = colors.now; ctx.lineWidth = 6;
        ctx.strokeRect(nb.x - 3, nb.y - 3, nb.w + 6, nb.h + 6);
      }

      // Captions under each side, set toward the centre.
      const capY = L.mobile ? 17 : 22;
      caption("2021, in the video", L.mobile ? A.x + A.w : A.x + A.w, A.y + A.h + capY, "right", colors.then, 1 - back * 0.5);
      caption("Today, run live", B.x, B.y + B.h + capY, "left", colors.now, Math.max(0.35, smooth(600, 1400, t)) * Math.max(0.35, fadeOut));
      ctx.globalAlpha = 1;
    };

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      draw((now - start) % LOOP);
      raf = requestAnimationFrame(frame);
    };
    const run = () => {
      cancelAnimationFrame(raf); raf = 0;
      if (!L) return;
      if (reduce.matches) { draw(7200); return; }
      if (visible) raf = requestAnimationFrame(frame);
    };

    const load = (src: string) => new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src;
    });

    let alive = true;
    void Promise.all([load("/hero/then.jpg"), load("/hero/now.jpg"), document.fonts?.ready]).then(([a, b]) => {
      if (!alive) return;
      thenImg = a; nowImg = b;
      readColors(); layout(); start = performance.now(); run();
      host.classList.add("is-ready");
    }).catch(() => host.classList.add("is-failed"));

    const ro = new ResizeObserver(() => { const w = host.clientWidth; if (L && Math.abs(w - L.W) < 2) return; layout(); run(); });
    ro.observe(host);
    const io = new IntersectionObserver(([e]) => { visible = Boolean(e?.isIntersecting); run(); });
    io.observe(host);
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    const onScheme = () => { readColors(); layout(); run(); };
    scheme.addEventListener("change", onScheme);
    reduce.addEventListener("change", run);
    return () => {
      alive = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      scheme.removeEventListener("change", onScheme); reduce.removeEventListener("change", run);
    };
  }, []);

  return (
    <div className="hero-art" ref={wrap}>
      <canvas ref={canvas} role="img" aria-label="A 2021 tutorial frame of nodejs.org with its download button outlined in amber dissolves, while today's nodejs.org resolves with its new Get Node.js button outlined in green." />
    </div>
  );
}
