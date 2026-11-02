"use client";

import { useEffect, useRef } from "react";
import type { Box, RunEvent, Step } from "@/lib/types";
import { Compare } from "./Compare";
import { Pill } from "./Pill";
import { plainStep, splitReasons } from "@/lib/steps";

const pct = (v: number, of: number) => (of > 0 ? (v / of) * 100 : 0);

// A screenshot with the SAM outline drawn on it, positioned in percentages.
export function Shot({ src, box, label, now }: { src: string; box: Box | null; label: string; now?: boolean }) {
  return (
    <figure className="shot">
      <div className="shot-img">
        <img src={src} alt={label} loading="lazy" />
        {box && box.w > 0 && box.h > 0 && (
          <span
            className={`cmp-box ${now ? "now" : "then"}`}
            style={{ left: `${pct(box.x1, box.w)}%`, top: `${pct(box.y1, box.h)}%`, width: `${pct(box.x2 - box.x1, box.w)}%`, height: `${pct(box.y2 - box.y1, box.h)}%` }}
          />
        )}
      </div>
      <figcaption><i className={now ? "dot-now" : "dot-then"} />{label}</figcaption>
    </figure>
  );
}

export function TermLine({ e, steps }: { e: RunEvent; steps: Pick<Step, "idx" | "action">[] }) {
  const p = e.payload;
  const idx = typeof p.index === "number" ? p.index : null;
  const step = idx === null ? null : steps.find((s) => s.idx === idx);
  switch (e.kind) {
    case "step_start":
      return <div className="ln head">Step {idx !== null ? idx + 1 : "?"}{step ? `: ${step.action}` : ""}</div>;
    case "thought":
      return <div className="ln thought">{String(p.text ?? "")}</div>;
    case "exec_start":
      return <div className="ln cmd">{String(p.command ?? "")}</div>;
    case "exec_done":
      return (
        <>
          {p.output ? <div className="ln out">{String(p.output)}</div> : null}
          <div className={`ln done ${p.exitCode === 0 ? "v-works" : "v-broken"}`}>exit {String(p.exitCode ?? "?")}</div>
        </>
      );
    case "step_done": {
      const v = String(p.verdict ?? "pending");
      return <div className={`ln done v-${v}`}>Step {idx !== null ? idx + 1 : "?"} {v}</div>;
    }
    case "browse":
      return <div className="ln cmd">{String(p.tool ?? "browser").replace(/^browser_/, "")} {String(p.what ?? "")}</div>;
    case "browse_done":
      return p.note ? <div className="ln out">{String(p.note)}</div> : null;
    default:
      return null;
  }
}

interface Props {
  step: Step;
  steps: Step[];
  events: RunEvent[];
  active?: boolean;
  live?: boolean;
  canSeek?: boolean;
  onSeek?: (idx: number) => void;
}

export function StepRow({ step, steps, events, active, live, canSeek, onSeek }: Props) {
  const ref = useRef<HTMLDetailsElement>(null);
  const v = live && (step.verdict ?? "pending") === "pending" ? "running" : step.verdict ?? "pending";
  const { said, checks } = splitReasons(step.reasons);
  const { text, code } = plainStep(step);
  const hasNow = Boolean(step.now_shot_url && (step.now_box || step.then_frame_url || step.action === "blender"));
  const ran = events.filter((e) => e.payload.index === step.idx);

  useEffect(() => {
    if (active && ref.current) ref.current.open = true;
  }, [active]);

  return (
    <details ref={ref} id={`step-${step.idx}`} className={`step v-${v} ${active ? "active" : ""} ${live ? "live" : ""}`}>
      <summary>
        <span className="step-time">{step.t_label}</span>
        <span className={`step-what ${code ? "is-code" : ""}`}>{text}</span>
        <Pill v={v} />
      </summary>
      <div className="step-body">
        {said.length > 0 && <div className="step-why">{said.map((r, i) => <p key={i}>{r}</p>)}</div>}
        {step.replacement && (
          <div className="today">
            <span className="today-lab">Today&apos;s way</span>
            <code>{step.replacement}</code>
          </div>
        )}
        {step.then_frame_url && hasNow ? (
          <Compare
            intro={false}
            then={{ src: step.then_frame_url, label: "In the video", alt: "The video frame for this step", box: step.then_box }}
            now={{ src: step.now_shot_url!, label: "Today", alt: "Today's screen for this step", box: step.now_box }}
          />
        ) : step.then_frame_url ? (
          <Shot src={step.then_frame_url} box={step.then_box} label="In the video" />
        ) : hasNow ? (
          <Shot src={step.now_shot_url!} box={step.now_box} label="Today" now />
        ) : null}
        <div className="step-actions">
          {canSeek && onSeek && (
            <button type="button" className="pill pill-line pill-sm" onClick={() => onSeek(step.idx)}>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.8v8.4L10 6z" fill="currentColor" /></svg>
              Watch this moment
            </button>
          )}
        </div>
        {(ran.length > 0 || checks.length > 0) && (
          <details className="ran">
            <summary>Show what ran</summary>
            <div className="term-body">
              {checks.map((c, i) => <div key={`c${i}`} className="ln thought">{c}</div>)}
              {ran.map((e) => <TermLine key={e.id} e={e} steps={steps} />)}
            </div>
          </details>
        )}
      </div>
    </details>
  );
}
