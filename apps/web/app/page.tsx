import Link from "next/link";
import { getSteps, latestDoneRun } from "@/lib/data";
import { runName } from "@/lib/format";
import { Footer, Header } from "@/components/Chrome";
import { StartBox } from "@/components/StartBox";
import { StepRow } from "@/components/StepRow";
import { Tape } from "@/components/Tape";

export const dynamic = "force-dynamic";

const FAQ: [string, string][] = [
  ["What tutorials can it run?", "Code and app building tutorials run today, in a sealed sandbox. Website, Blender and account tutorials are next. If a run needs a runner that is not live yet, the run page says so plainly."],
  ["Does it touch my accounts?", "No. Runs happen in a sealed sandbox with none of your logins. Origin stops before any step that would publish, pay, delete or send, and marks that step gated."],
  ["Which models does it use?", "Muse Spark watches the video, plans each step and checks the result. Muse Voice Transcribe reads the narration. SAM 3.1 outlines what was clicked."],
  ["Is it free?", "Yes, during the hackathon. Every run uses real compute, so the number of runs may be limited."],
  ["What if it gets it wrong?", "Every run is public with its full output. You can open any step, read the terminal, and judge it yourself. The results page lists every run."],
  ["How long does a run take?", "A short tutorial usually takes a few minutes. Watching the video comes first, then each step runs in turn. The run page shows exactly where it is."],
];

export default async function Home() {
  const run = await latestDoneRun().catch(() => null);
  const steps = run ? await getSteps(run.id).catch(() => []) : [];

  return (
    <>
      <Header />
      <main>
        <section className="wrap section">
          <h1 className="display">Tutorials age. <em>Origin</em> runs them today.</h1>
          <p className="lede">
            Paste a tutorial video. Origin runs every step on today&apos;s software, shows where it breaks, and gives you the version that works now.
          </p>
          <StartBox />
        </section>

        {run && steps.length > 0 && (
          <section className="wrap" style={{ paddingTop: 64 }}>
            <p className="eyebrow">Latest finished run</p>
            <h2 className="h2" style={{ fontSize: "clamp(28px, 4.5vw, 48px)" }}>
              <Link href={`/run/${run.id}`} style={{ textDecoration: "none" }}>{runName(run)}</Link>
            </h2>
            <Tape steps={steps} />
            {steps.slice(0, 4).map((s) => <StepRow key={s.id} step={s} />)}
            <p style={{ marginTop: 16 }}><Link href={`/run/${run.id}`}>Open the full run</Link></p>
          </section>
        )}

        <div className="wrap" style={{ marginTop: 96 }}>
          <section className="sec">
            <span className="num">01 THE PROBLEM</span>
            <div>
              <h2 className="h2">Tutorials break <em>silently</em>.</h2>
              <p>A video stays up for years. The software it teaches does not. A command that once worked now prints a warning, or an error, or worse, prints Success while teaching something that was retired.</p>
              <p>Viewers find out one by one, in the comments, after they have lost an evening. Nobody checks the video itself.</p>
            </div>
          </section>

          <section className="sec">
            <span className="num">02 HOW IT WORKS</span>
            <div>
              <h2 className="h2">Four moves, one <em>run</em>.</h2>
              <ol className="steps4">
                <li><b>Watch</b><span>Muse Spark reads the video and its narration. Muse Voice Transcribe catches steps that are only spoken.</span></li>
                <li><b>Point</b><span>SAM 3.1 outlines what was clicked, so every visual step has a target.</span></li>
                <li><b>Run</b><span>Each step runs in a sealed sandbox, one at a time, and is marked works, changed or broken.</span></li>
                <li><b>Repair</b><span>A fix is kept only if it runs. Otherwise the step stays broken.</span></li>
              </ol>
            </div>
          </section>

          <section className="sec">
            <span className="num">03 THEN AND NOW</span>
            <div>
              <h2 className="h2">The old video beside <em>today</em>.</h2>
              <p>Every step keeps the moment from the video in warm amber, with the outline of what was clicked. Next to it sits what the same step does now, crisp and live.</p>
              <p>Along the top, a tape of the whole tutorial. Each step is a tick at its timestamp, colored by what happened when it ran.</p>
            </div>
          </section>

          <section className="sec">
            <span className="num">04 FOR CREATORS</span>
            <div>
              <h2 className="h2">Your video breaks at <em>3:42</em>.</h2>
              <p>Creators get the exact second a step stopped working, why, and the fix. Pin the fix in your comments and your viewers stop getting stuck.</p>
            </div>
          </section>

          <section className="sec">
            <span className="num">05 PROOF</span>
            <div>
              <h2 className="h2">Every run is <em>public</em>.</h2>
              <p>No cherry picked demos. Each run keeps its steps, its verdicts and its full terminal output.</p>
              <p><Link href="/results">See all results</Link></p>
            </div>
          </section>

          <section className="sec">
            <span className="num">06 FAQ</span>
            <div className="faq">
              <h2 className="h2">Honest <em>answers</em>.</h2>
              {FAQ.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}</summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
