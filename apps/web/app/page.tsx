import Link from "next/link";
import { getSteps, listRuns, stepsByRun } from "@/lib/data";
import { KNOWN_MISSES } from "@/lib/misses";
import { Footer, Header } from "@/components/Chrome";
import { StartBox } from "@/components/StartBox";
import { Hero } from "@/components/Hero";
import { ZoomPair } from "@/components/ZoomPair";
import { Compare } from "@/components/Compare";
import { CountUp, PointVisual, RepairVisual, RunVisual, WatchVisual } from "@/components/HowVisuals";

export const dynamic = "force-dynamic";

const FAQ: [string, string][] = [
  ["What tutorials can it run?", "Code and terminal tutorials run in an isolated container that holds none of Origin's keys. Website tutorials run in a real browser. Blender tutorials run in today's Blender, and the finished model is compared with the video's. Tutorials that need your account hand you a live browser to log in yourself. Phone apps and hardware are out of scope, and the run page says so."],
  ["Does it touch my accounts?", "Only if you log in yourself, in the live browser on your own run. Only the person who started a run can see that browser or control it. What you type is held only until the browser applies it, then deleted, and never logged. After you log in, no more screenshots are saved publicly; Muse Spark still sees the screen so it can do the step. Origin is built to stop before steps that publish, pay, delete or send, and refuses commands that publish, deploy or push."],
  ["Which models does it use?", "Muse Spark 1.3 watches the video and runs every step as an agent. Muse Voice Transcribe catches steps that are only spoken. SAM 3.1 outlines what was clicked, in the old video and on today's screen. Muse Spark Open picks the right element when several look alike. Muse Image draws the step cards for creators."],
  ["Is it free?", "Yes, during the hackathon. Every run uses real compute, so only a few runs go at once and a few start each hour."],
  ["What if it gets it wrong?", "Every run is public with its steps and terminal output. You can open any step and judge it yourself. Runs are never edited: wrong verdicts found by hand are labelled on the results page and logged with their fix."],
  ["How long does a run take?", "Usually 10 to 25 minutes: Muse Spark watches the video first, then each step runs in turn. The run page shows exactly where it is."],
];

const HOW = [
  { n: "01", name: "Watch", text: "Muse Spark reads the video and its narration. Muse Voice Transcribe catches steps that are only spoken.", V: WatchVisual },
  { n: "02", name: "Point", text: "SAM 3.1 outlines what was clicked in the old video, then finds the same thing on today's screen.", V: PointVisual },
  { n: "03", name: "Run", text: "Every step runs for real, in a container, a browser or today's Blender, and is marked works, changed or broken.", V: RunVisual },
  { n: "04", name: "Repair", text: "A fix is kept only if it runs. Otherwise the step stays broken.", V: RepairVisual },
];

const CREATOR_RUN = "0804bd40-d22e-4e79-a5ac-0902a130c164";

// The comment Origin wrote for the creator of a real run, shown as it would look pinned.
async function creatorNote() {
  try {
    const st = await getSteps(CREATOR_RUN);
    const s = st.find((x) => x.verdict === "broken" && !(x.reasons?.[0] ?? "").startsWith("Origin could not")) ?? st.find((x) => x.verdict === "changed");
    if (!s) return null;
    const why = (s.reasons?.[0] ?? "").split(/[;.]\s/)[0];
    const fix = s.replacement ? `Use: ${s.replacement.split("\n")[0]}` : `${why}.`;
    return { at: s.t_label, text: `Heads up for anyone following along today: at ${s.t_label}, ${s.verdict === "broken" ? "this step no longer works" : "this step has changed"}. ${fix} Checked by actually running it on Origin.` };
  } catch {
    return null;
  }
}

async function proof() {
  try {
    const runs = (await listRuns()).filter((r) => r.status === "done");
    const byRun = await stepsByRun(runs.map((r) => r.id));
    let checked = 0, flagged = 0;
    for (const steps of Object.values(byRun)) {
      for (const s of steps) {
        if (s.verdict === "works" || s.verdict === "changed" || s.verdict === "broken") checked++;
        if (s.verdict === "changed" || s.verdict === "broken") flagged++;
      }
    }
    // One row per tutorial (the latest finished run of each), every one linked.
    const seen = new Set<string>();
    const list = runs.filter((r) => { const k = r.title ?? r.id; if (seen.has(k)) return false; seen.add(k); return true; }).map((r) => {
      const st = byRun[r.id] ?? [];
      const n = (v: string) => st.filter((s) => s.verdict === v).length;
      return { id: r.id, title: r.title ?? "Untitled tutorial", kind: r.kind ?? "", works: n("works"), changed: n("changed"), broken: n("broken"), skipped: n("skipped") + n("gated") };
    });
    return runs.length ? { runs: runs.length, checked, flagged, list } : null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const [stats, note] = await Promise.all([proof(), creatorNote()]);

  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="hero-copy wrap">
            <h1 className="hero-title">
              <span className="tone">Tutorials age.</span>
              <span>Origin runs them today.</span>
            </h1>
            <p className="hero-sub">Paste a tutorial video. Origin runs every step on today&apos;s software and shows you exactly what changed.</p>
            <Link href="#start" className="pill pill-dark">Run a tutorial</Link>
          </div>
          <Hero />
          <div className="hero-foot wrap">
            <span>Every step, run for real.</span>
            <span className="hero-foot-mid">Muse Spark watches the video, runs it on today&apos;s software, and keeps a fix only if it ran.</span>
            <a href="#start">[Scroll to explore]</a>
          </div>
        </section>

        <section id="start" className="section start-sec wrap" data-reveal>
          <p className="label">Start</p>
          <h2 className="h2"><span className="tone">Paste a tutorial.</span> Watch it run.</h2>
          <StartBox />
          <p className="start-note">Free during the hackathon. A run usually takes 10 to 25 minutes, and you can watch every step as it happens.</p>
        </section>

        <section id="how" className="section wrap">
          <div data-reveal>
            <p className="label">How it works</p>
            <h2 className="h2"><span className="tone">Four moves,</span> one honest run.</h2>
          </div>
          <ol className="how">
            {HOW.map(({ n, name, text, V }) => (
              <li key={n} className="how-row" data-reveal>
                <span className="how-n">{n}</span>
                <div className="how-text">
                  <h3>{name}</h3>
                  <p>{text}</p>
                </div>
                <div className="how-vis"><V /></div>
              </li>
            ))}
          </ol>
        </section>

        <section id="results" className="section wrap">
          <div data-reveal>
            <p className="label">Then and now</p>
            <h2 className="h2"><span className="tone">The old video,</span> beside today.</h2>
          </div>
          <div data-reveal>
            <ZoomPair
              then={{ src: "/hero/then.jpg", label: "2021, in the video", alt: "The 14.17.5 LTS download button in the 2021 video", box: { x1: 234, y1: 163, x2: 314, y2: 189, w: 640, h: 360 }, caption: "The video says: click 14.17.5 LTS. That version is end of life." }}
              now={{ src: "/hero/now.jpg", label: "Today, run live", alt: "The Get Node.js button on nodejs.org today", box: { x1: 112, y1: 408, x2: 511, y2: 453, w: 1280, h: 720 }, caption: "Today the button reads Get Node.js. SAM 3.1 found it and Origin clicked it." }}
            />
          </div>
          <figure className="cmp-fig" data-reveal>
            <Compare
              then={{ src: "/hero/then.jpg", label: "2021, in the video", alt: "nodejs.org in 2021 with the 14.17.5 LTS button outlined", box: { x1: 234, y1: 163, x2: 314, y2: 189, w: 640, h: 360 } }}
              now={{ src: "/hero/now.jpg", label: "Today, run live", alt: "nodejs.org today with the Get Node.js button outlined", box: { x1: 112, y1: 408, x2: 511, y2: 453, w: 1280, h: 720 } }}
            />
            <figcaption>
              Step 5 of a 2021 React tutorial. The button it tells you to click is gone; Origin found today&apos;s.
              <Link href="/run/f6d2a108-4d25-459a-bd8f-d55e1721f8ab">Open the run</Link>
            </figcaption>
          </figure>
          <figure className="cmp-fig" data-reveal>
            <Compare
              then={{ src: "/hero/barrel_then.jpg", label: "2019, in the video", alt: "The finished barrel model in the 2019 Blender tutorial" }}
              now={{ src: "/hero/barrel_now.png", label: "Blender 5.2, rebuilt", alt: "Origin's rebuild of the barrel in today's Blender" }}
            />
            <figcaption>
              A 2019 Blender tutorial rebuilt in Blender 5.2. Spark&apos;s verdict: partly matches.
              <Link href="/run/95a35e1d-154f-480c-891d-aa586d5042bc">Open the run</Link>
            </figcaption>
          </figure>
        </section>

        <section id="creators" className="section wrap creators">
          <div className="creators-copy" data-reveal>
            <p className="label">For creators</p>
            <h2 className="h2"><span className="tone">Made a tutorial?</span> Know the second it broke.</h2>
            <p className="body-lg">Your old videos keep getting views long after the software moved on, and viewers get stuck in the comments. Origin runs your video, finds the exact step that stopped working, and writes the note for you.</p>
            <ol className="creator-steps">
              <li><span><b>Where it breaks.</b> The exact timestamp, and why.</span></li>
              <li><span><b>A comment to pin.</b> The fix in plain words, ready to paste.</span></li>
              <li><span><b>A card to post.</b> Drawn by Muse Image, with the exact command.</span></li>
            </ol>
            <Link href={`/run/${CREATOR_RUN}/creator`} className="pill pill-line">See a real creator page</Link>
          </div>
          <div className="creators-demo" data-reveal>
            {note && (
              <div className="yt-comment">
                <span className="yt-pin">Pinned by the creator</span>
                <div className="yt-row">
                  <span className="yt-avatar" aria-hidden="true">T</span>
                  <p>{note.text}</p>
                </div>
              </div>
            )}
            <figure className="creators-card">
              <img src="/hero/card.png" alt="A step card drawn by Muse Image: step 8 at 01:08 is broken today, with the old command and why it fails" loading="lazy" />
              <figcaption>The comment and the card Origin made for a 2021 Tailwind tutorial. Both come from a real run.</figcaption>
            </figure>
          </div>
        </section>

        <section className="section wrap proof" data-reveal>
          <p className="label">Proof</p>
          <h2 className="h2"><span className="tone">Every run is public,</span> misses included.</h2>
          {stats && (
            <dl className="stats">
              <div><dt>Tutorials run to the end</dt><dd><CountUp value={stats.runs} /></dd></div>
              <div><dt>Steps run for real</dt><dd><CountUp value={stats.checked} /></dd></div>
              <div><dt>Steps changed or broken</dt><dd><CountUp value={stats.flagged} /></dd></div>
            </dl>
          )}
          {stats && (
            <ol className="run-list">
              {stats.list.map((r) => {
                const total = r.works + r.changed + r.broken + r.skipped || 1;
                const kind = r.kind === "code" ? "Terminal" : r.kind === "web" ? "Website" : r.kind === "blender" ? "Blender" : r.kind === "account" ? "Account" : "";
                return (
                  <li key={r.id}>
                    <Link href={`/run/${r.id}`}>
                      <span className="rl-title">{r.title}{KNOWN_MISSES[r.id] ? <em className="rl-miss"> known miss</em> : null}</span>
                      <span className="rl-kind">{kind}</span>
                      <span className="rl-bar" aria-hidden="true">
                        <i className="w" style={{ width: `${(r.works / total) * 100}%` }} />
                        <i className="c" style={{ width: `${(r.changed / total) * 100}%` }} />
                        <i className="b" style={{ width: `${(r.broken / total) * 100}%` }} />
                      </span>
                      <span className="rl-sum">{r.broken ? `${r.broken} broken` : r.changed ? `${r.changed} changed` : "All work"}</span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          )}
          <Link href="/results" className="arrow-link">See every run, misses included</Link>
        </section>

        <section className="section wrap faq-sec" data-reveal>
          <div>
            <p className="label">FAQ</p>
            <h2 className="h2"><span className="tone">Honest</span> answers.</h2>
          </div>
          <div className="faq">
            {FAQ.map(([q, a], i) => (
              <details key={q} open={i === 0}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
