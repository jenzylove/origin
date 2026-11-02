import type { CBox } from "./Compare";

interface Side { src: string; label: string; box: CBox; alt: string; caption: string }

const PANEL = 4 / 3;

// Crop an image around the element SAM outlined, so the element fills about half the panel.
function framing(box: CBox) {
  const r = box.w / box.h;
  const bw = (box.x2 - box.x1) / box.w;
  const cx = (box.x1 + box.x2) / 2 / box.w;
  const cy = (box.y1 + box.y2) / 2 / box.h;
  const scale = Math.min(8, Math.max(0.5 / Math.max(bw, 0.01), 1, r / PANEL));
  const panelH = 1 / PANEL;
  const left = Math.min(0, Math.max(1 - scale, 0.5 - cx * scale));
  const top = Math.min(0, Math.max(panelH - scale / r, panelH / 2 - cy * (scale / r)));
  const outline = {
    left: (left + (box.x1 / box.w) * scale) * 100,
    top: ((top + (box.y1 / box.h) * (scale / r)) / panelH) * 100,
    width: ((box.x2 - box.x1) / box.w) * scale * 100,
    height: (((box.y2 - box.y1) / box.h) * (scale / r) / panelH) * 100,
  };
  return { img: { left: left * 100, top: (top / panelH) * 100, width: scale * 100 }, outline };
}

function Panel({ side, now }: { side: Side; now?: boolean }) {
  const f = framing(side.box);
  return (
    <figure className={`zp-panel ${now ? "now" : "then"}`}>
      <div className="zp-frame">
        <img src={side.src} alt={side.alt} style={{ left: `${f.img.left}%`, top: `${f.img.top}%`, width: `${f.img.width}%` }} />
        <span className={`zp-box ${now ? "now" : "then"}`} style={{ left: `${f.outline.left}%`, top: `${f.outline.top}%`, width: `${f.outline.width}%`, height: `${f.outline.height}%` }} />
        <span className="zp-tag"><i />{side.label}</span>
      </div>
      <figcaption>{side.caption}</figcaption>
    </figure>
  );
}

/** The clearest before and after: each image zoomed onto what SAM 3.1 outlined, side by side. */
export function ZoomPair({ then, now }: { then: Side; now: Side }) {
  return (
    <div className="zp">
      <Panel side={then} />
      <span className="zp-arrow" aria-hidden>→</span>
      <Panel side={now} now />
    </div>
  );
}
