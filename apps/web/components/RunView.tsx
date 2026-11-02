"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Run, RunEvent, Step } from "@/lib/types";
import { isFinished } from "@/lib/types";
import { countVerdicts, runName, shortDate } from "@/lib/format";
import { Tape } from "./Tape";
import { StepRow, TermLine } from "./StepRow";
import { Pill } from "./Pill";
import { plainStep, splitReasons } from "@/lib/steps";
import { ZoomPair } from "./ZoomPair";
import { Compare } from "./Compare";
import { LiveBrowser } from "./LiveBrowser";

interface Payload { run: Run; steps: Step[]; events: RunEvent[] }

const TERMINAL_KINDS = new Set(["exec_start", "exec_done", "thought", "step_start", "step_done", "browse", "browse_done"]);
const BAR: { key: string; label: string }[] = [
  { key: "works", label: "Works" },
  { key: "changed", label: "Changed" },
  { key: "broken", label: "Broken" },
  { key: "other", label: "Not checked" },
];

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

  // Poll our own API until the run is done or failed; the next poll starts only after the last one ends.
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
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      await tick();
      if (!stop) timer = setTimeout(loop, 2000);
    };
    timer = setTimeout(loop, 2000);
    return () => {
      stop = true;
      clearTimeout(timer);
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

  const seek = useCallback(
    (idx: number) => {
      const step = steps.find((s) => s.idx === idx);
      if (step && frame.current?.contentWindow) {
        frame.current.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: "seekTo", args: [Math.floor(Number(step.t)), true] }),
          "*",
        );
        frame.current.contentWindow.postMessage(JSON.stringify({ event: "command", func: "playVideo", args: [] }), "*");
      }
    },
    [steps],
  );

  const select = useCallback(
    (idx: number) => {
      setSelected(idx);
      seek(idx);
      document.getElementById(`step-${idx}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    [seek],
  );

  const watchMoment = useCallback(
    (idx: number) => {
      setSelected(idx);
      seek(idx);
      document.getElementById("original")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    },
    [seek],
  );

  const counts = countVerdicts(steps);
  const doneSteps = steps.filter((s) => s.verdict && s.verdict !== "pending" && s.verdict !== "running").length;
  const lines = events.filter((e) => TERMINAL_KINDS.has(e.kind));
  const final = run.summary?.final;
  const headline = summarize(run, steps, counts, doneSteps, liveIdx);
  const when = run.finished_at ?? run.created_at;

  // The one result to lead with: first broken step, else first changed, that has both pictures.
  const lead = useMemo(() => {
    const pics = steps.filter((s) => s.then_frame_url && s.now_shot_url);
    return pics.find((s) => s.verdict === "broken") ?? pics.find((s) => s.verdict === "changed") ?? null;
  }, [steps]);

  const bar = {
    works: counts.works ?? 0,
    changed: counts.changed ?? 0,
    broken: counts.broken ?? 0,
    other: steps.length - (counts.works ?? 0) - (counts.changed ?? 0) - (counts.broken ?? 0),
  } as Record<string, number>;

  return (
    <main className="run wrap">
      <Link href="/results" className="back">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M8.5 3 4.5 7l4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        All runs
      </Link>
      <h1 className="run-title">{runName(run)}</h1>
      <p className="run-meta">
        {finished ? "Checked" : "Started"} {shortDate(when)}
        {steps.length > 0 && <> · {steps.length} steps</>}
        {run.source_url && <> · <a href={run.source_url} target="_blank" rel="noreferrer">watch the original</a></>}
      </p>

      <section className={`summary s-${run.status}`}>
        <p className="summary-line">
          {!finished && <i className="live-dot" aria-hidden="true" />}
          {headline}
        </p>
        {run.status === "failed" && <p className="summary-err">{run.error ?? "No error message was stored."}</p>}
        {offline && !finished && <p className="summary-note">Connection lost, retrying.</p>}
        {steps.length > 0 && (
          <>
            <div className="bar" role="img" aria-label={BAR.map((b) => `${bar[b.key]} ${b.label.toLowerCase()}`).join(", ")}>
              {BAR.map((b) => (bar[b.key] ?? 0) > 0 && (
                <span key={b.key} className={`bar-seg b-${b.key}`} style={{ flexGrow: bar[b.key] }} />
              ))}
            </div>
            <ul className="legend">
              {BAR.map((b) => (bar[b.key] ?? 0) > 0 && (
                <li key={b.key}><i className={`b-${b.key}`} />{b.label} <b>{bar[b.key]}</b></li>
              ))}
            </ul>
          </>
        )}
        {run.status === "done" && (counts.changed || counts.broken) ? (
          <Link href={`/run/${run.id}/creator`} className="pill pill-line creator-btn">For the creator</Link>
        ) : null}
      </section>

      {run.status === "waiting_user" && (
        <LiveBrowser
          runId={run.id}
          site={String([...events].reverse().find((e) => e.kind === "login_needed")?.payload?.site ?? "")}
        />
      )}

      {final ? (
        <section className="lead" data-reveal>
          <p className="label">The finished result, then and now</p>
          <Compare
            then={{ src: final.then_url, label: "In the video", alt: "The finished model in the video" }}
            now={{ src: final.now_url, label: "Rebuilt today", alt: "Origin's rebuild in today's software" }}
          />
          <p className="lead-verdict">
            <span className={`vpill m-${final.match}`}>{final.match === "yes" ? "Matches" : final.match === "partly" ? "Partly matches" : "Does not match"}</span>
            <span>{final.note}</span>
          </p>
        </section>
      ) : lead ? (
        <section className="lead" data-reveal>
          <p className="label">What changed most</p>
          <h2 className="lead-title">
            <span className="lead-at">Step {lead.idx + 1} at {lead.t_label}</span>
            <span className={plainStep(lead).code ? "is-code" : ""}>{plainStep(lead).text}</span>
          </h2>
          {lead.then_box && lead.now_box ? (
            <ZoomPair
              then={{ src: lead.then_frame_url!, label: "In the video", alt: "What the video shows for this step", box: lead.then_box, caption: "What the video tells you to use." }}
              now={{ src: lead.now_shot_url!, label: "Today", alt: "The same thing on today's screen", box: lead.now_box, caption: "What is there today, found by SAM 3.1." }}
            />
          ) : (
            <Compare
              then={{ src: lead.then_frame_url!, label: "In the video", alt: "The video frame for this step", box: lead.then_box }}
              now={{ src: lead.now_shot_url!, label: "Today", alt: "Today's screen for this step", box: lead.now_box }}
            />
          )}
          <div className="lead-why">
            <Pill v={lead.verdict ?? "pending"} />
            <p>{splitReasons(lead.reasons).said[0] ?? ""}</p>
          </div>
          {lead.replacement && (
            <div className="today"><span className="today-lab">Today&apos;s way</span><code>{lead.replacement}</code></div>
          )}
        </section>
      ) : null}

      <section className="steps-sec">
        <div className="steps-head">
          <p className="label">Every step</p>
          {steps.length > 0 && <Tape steps={steps} selected={selected} liveIdx={liveIdx} onSelect={select} />}
        </div>
        <div className={`steps-grid ${run.video_id ? "" : "no-video"}`}>
          {run.video_id && (
            <aside className="original" id="original">
              <p className="label">Original video</p>
              <div className="video">
                <iframe
                  ref={frame}
                  src={`https://www.youtube.com/embed/${run.video_id}?enablejsapi=1&rel=0`}
                  title="Tutorial video"
                  allow="accelerometer; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </aside>
          )}
          <div className="steps-list">
            {steps.length === 0 ? (
              <p className="empty">{finished ? "This run stored no steps." : "Steps appear here when Muse Spark finishes watching."}</p>
            ) : (
              steps.map((s) => (
                <StepRow
                  key={s.id}
                  step={s}
                  steps={steps}
                  events={events}
                  active={selected === s.idx}
                  live={liveIdx === s.idx}
                  canSeek={Boolean(run.video_id)}
                  onSeek={watchMoment}
                />
              ))
            )}
          </div>
        </div>
      </section>

      <details className="full-log">
        <summary>Show the full log</summary>
        <div
          className="term-body"
          ref={termBody}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          }}
        >
          {lines.length === 0 && <div className="ln out">Nothing has run yet.</div>}
          {lines.map((e) => <TermLine key={e.id} e={e} steps={steps} />)}
          {!finished && <span className="cursor" />}
        </div>
      </details>
    </main>
  );
}

function plural(n: number, one: string, many: string) { return n === 1 ? one : many; }

function summarize(run: Run, steps: Step[], c: Record<string, number>, done: number, liveIdx: number | null): string {
  const n = steps.length;
  switch (run.status) {
    case "queued": return "Waiting for a free runner. This page updates by itself.";
    case "extracting": return "Muse Spark is watching the video.";
    case "running": {
      if (!n) return "Muse Spark is watching the video.";
      const at = (liveIdx ?? Math.min(done, n - 1)) + 1;
      return `Origin is on step ${at} of ${n}.`;
    }
    case "waiting_user": return "Waiting for a login. Origin carries on once the account step is done.";
    case "failed": return "This run stopped before the end.";
    case "done": {
      const b = c.broken ?? 0, ch = c.changed ?? 0, w = c.works ?? 0;
      const final = run.summary?.final;
      if (!n) return "This run finished without finding any steps.";
      if (b) return `${b} of ${n} steps ${plural(b, "is", "are")} broken today.${ch ? ` ${ch} more ${plural(ch, "has", "have")} changed.` : ""}`;
      if (ch) return `${ch} of ${n} steps changed since this video was made. Nothing is broken.`;
      if (final) {
        const m = final.match === "yes" ? "matches the video" : final.match === "partly" ? "partly matches the video" : "does not match the video";
        return `${w === n ? `All ${n}` : `${w} of ${n}`} steps ran in ${run.kind === "blender" ? "today's Blender" : "today's software"}. The finished ${run.kind === "blender" ? "model" : "result"} ${m}.`;
      }
      if (w === n) return "Every step still works today.";
      return `${w} of ${n} steps still work today. The rest could not be checked.`;
    }
  }
}
