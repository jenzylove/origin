"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Run, RunEvent, Step } from "@/lib/types";
import { isFinished } from "@/lib/types";
import { countVerdicts, runName, statusLabel, VERDICTS } from "@/lib/format";
import { Tape } from "./Tape";
import { StepRow, Shot } from "./StepRow";

interface Payload { run: Run; steps: Step[]; events: RunEvent[] }

const TERMINAL_KINDS = new Set(["exec_start", "exec_done", "thought", "step_start", "step_done"]);

export function RunView({ initial }: { initial: Payload }) {
  const [run, setRun] = useState(initial.run);
  const [steps, setSteps] = useState(initial.steps);
  const [events, setEvents] = useState(initial.events);
  const [selected, setSelected] = useState<number | null>(null);
  const [offline, setOffline] = useState(false);
  const lastId = useRef(initial.events.at(-1)?.id ?? 0);
  const frame = useRef<HTMLIFrameElement>(null);
  const termBody = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const finished = isFinished(run.status);

  // Poll our own API every 1500 ms until the run is done or failed.
  useEffect(() => {
    if (finished) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/runs/${run.id}?after=${lastId.current}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Payload;
        if (stop) return;
        setRun(data.run);
        setSteps(data.steps);
        if (data.events.length) {
          lastId.current = data.events.at(-1)!.id;
          setEvents((prev) => [...prev, ...data.events]);
        }
        setOffline(false);
      } catch {
        if (!stop) setOffline(true);
      }
    };
    const timer = setInterval(tick, 1500);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, [run.id, finished]);

  // Keep the terminal pinned to the newest line unless the reader scrolled up.
  useEffect(() => {
    const el = termBody.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  // The step being worked on: last step_start with no step_done after it.
  const liveIdx = useMemo(() => {
    if (finished) return null;
    let cur: number | null = null;
    for (const e of events) {
      const i = Number(e.payload.index);
      if (e.kind === "step_start") cur = i;
      if (e.kind === "step_done" && cur === i) cur = null;
    }
    return cur;
  }, [events, finished]);

  const select = useCallback(
    (idx: number) => {
      setSelected(idx);
      const step = steps.find((s) => s.idx === idx);
      if (step && frame.current?.contentWindow) {
        frame.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "seekTo", args: [Math.floor(Number(step.t)), true] }),
          "*",
        );
      }
      document.getElementById(`step-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    [steps],
  );

  const counts = countVerdicts(steps);
  const doneSteps = steps.filter((s) => s.verdict && s.verdict !== "pending" && s.verdict !== "running").length;
  const lines = events.filter((e) => TERMINAL_KINDS.has(e.kind));

  return (
    <main className="wrap">
      <div className="run-head">
        <p className="eyebrow">Run {run.id.slice(0, 8)}</p>
        <h1>{runName(run)}</h1>
        <div className="meta">
          <span>{statusLabel(run)}</span>
          {run.kind && <span>Kind: {run.kind}</span>}
          {run.source_url && <a href={run.source_url}>{run.source_url}</a>}
        </div>
      </div>

      <div className={`banner ${run.status}`}>
        <span className="state">
          {!finished && <i className="spin" />}
          {bannerText(run, steps.length, doneSteps)}
        </span>
        {run.status === "done" && (
          <div className="counts">
            {VERDICTS.map((v) => (
              <span key={v} className={`chip v-${v}`}>{v} <b>{counts[v] ?? 0}</b></span>
            ))}
          </div>
        )}
        {run.status === "failed" && <pre>{run.error ?? "No error message was stored."}</pre>}
        {offline && !finished && <span className="eyebrow" style={{ margin: 0 }}>Connection lost, retrying</span>}
      </div>

      {run.summary?.final && (
        <section className="final">
          <div className="eyebrow">The finished result, then and now</div>
          <p className={`final-verdict m-${run.summary.final.match}`}>
            <b>{run.summary.final.match === "yes" ? "Matches" : run.summary.final.match === "partly" ? "Partly matches" : "Does not match"}.</b>{" "}
            {run.summary.final.note}
          </p>
          <div className="pair two">
            <Shot src={run.summary.final.then_url} box={null} label="THEN" />
            <Shot src={run.summary.final.now_url} box={null} label="NOW" now />
          </div>
        </section>
      )}

      {steps.length > 0 && <Tape steps={steps} selected={selected} liveIdx={liveIdx} onSelect={select} />}

      <div className="cols">
        <div className="col-left">
          {run.video_id && (
            <div className="video then-media">
              <span className="tag">THEN</span>
              <iframe
                ref={frame}
                src={`https://www.youtube.com/embed/${run.video_id}?enablejsapi=1&rel=0`}
                title="Tutorial video"
                allow="accelerometer; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
          {steps.length === 0 ? (
            <p className="empty">{finished ? "This run stored no steps." : "No steps yet. They appear when Muse Spark finishes watching."}</p>
          ) : (
            steps.map((s) => (
              <StepRow key={s.id} step={s} active={selected === s.idx} live={liveIdx === s.idx} onSelect={select} />
            ))
          )}
        </div>

        <aside className="col-right">
          <div className="term">
            <div className="term-bar"><span>Terminal</span><span>{lines.length} lines</span></div>
            <div
              className="term-body"
              ref={termBody}
              onScroll={(e) => {
                const el = e.currentTarget;
                stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
              }}
            >
              {lines.length === 0 && <div className="ln out">No terminal output yet.</div>}
              {lines.map((e) => <TermLine key={e.id} e={e} steps={steps} />)}
              {!finished && <span className="cursor" />}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}

function bannerText(run: Run, total: number, done: number): string {
  switch (run.status) {
    case "queued": return "Queued. Waiting for a runner.";
    case "extracting": return "Muse Spark is watching the video.";
    case "running": return total ? `Running. ${done} of ${total} steps checked.` : "Running.";
    case "waiting_user": return "Stopped before an action that needs your approval.";
    case "done": return `Done. ${total} steps checked.`;
    case "failed": return "Failed.";
  }
}

function TermLine({ e, steps }: { e: RunEvent; steps: Step[] }) {
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
    default:
      return null;
  }
}
