import type { Box, Step } from "@/lib/types";

const pct = (v: number, of: number) => (of > 0 ? (v / of) * 100 : 0);

// A screenshot with the SAM outline drawn on it, positioned in percentages.
function Shot({ src, box, label, now }: { src: string; box: Box | null; label: string; now?: boolean }) {
  return (
    <div className={`shot ${now ? "" : "then-media"}`}>
      <img src={src} alt={`${label} frame`} loading="lazy" />
      <span className={`tag ${now ? "now" : ""}`}>{label}</span>
      {box && box.w > 0 && box.h > 0 && (
        <span
          className={`box ${now ? "now" : ""}`}
          style={{
            left: `${pct(box.x1, box.w)}%`,
            top: `${pct(box.y1, box.h)}%`,
            width: `${pct(box.x2 - box.x1, box.w)}%`,
            height: `${pct(box.y2 - box.y1, box.h)}%`,
          }}
        />
      )}
    </div>
  );
}

interface Props {
  step: Step;
  active?: boolean;
  live?: boolean;
  onSelect?: (idx: number) => void;
}

export function StepRow({ step, active, live, onSelect }: Props) {
  const v = step.verdict ?? "pending";
  const reasons = Array.isArray(step.reasons) ? step.reasons : [];
  const hasNow = Boolean(step.now_shot_url && step.now_box);
  return (
    <article
      id={`step-${step.idx}`}
      className={`step v-${v} ${active ? "active" : ""} ${live ? "live" : ""} ${onSelect ? "" : "static"}`}
      onClick={onSelect ? () => onSelect(step.idx) : undefined}
    >
      <div className="time">{step.t_label}</div>
      <div>
        <div className="head">
          <h3>{step.action}</h3>
          <span className={`chip v-${live && v === "pending" ? "running" : v}`}>{live && v === "pending" ? "running" : v}</span>
        </div>
        <pre className="detail">{step.detail}</pre>
        {reasons.length > 0 && <ul>{reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>}
        {step.replacement && (
          <div className="today">
            <div className="lab">Today&apos;s way</div>
            <pre>{step.replacement}</pre>
          </div>
        )}
        {step.then_frame_url && (
          <div className={`pair ${hasNow ? "two" : ""}`}>
            <Shot src={step.then_frame_url} box={step.then_box} label="THEN" />
            {hasNow && <Shot src={step.now_shot_url!} box={step.now_box} label="NOW" now />}
          </div>
        )}
      </div>
    </article>
  );
}
