import Link from "next/link";
import { getSteps, latestDoneRun } from "@/lib/data";
import { runName } from "@/lib/format";
import { Footer, Header } from "@/components/Chrome";
import { StartBox } from "@/components/StartBox";
import { StepRow } from "@/components/StepRow";
import { Tape } from "@/components/Tape";

export const dynamic = "force-dynamic";

const FAQ: [string, string][] = [
  ["What tutorials can it run?", "Code and terminal tutorials run in an isolated container that holds none of Origin's keys. Website tutorials run in a real browser. Blender tutorials run in today's Blender, and the finished model is compared with the video's. Tutorials that need your account hand you a live browser to log in yourself. Phone apps and hardware are out of scope, and the run page says so."],
  ["Does it touch my accounts?", "Only if you log in yourself, in the live browser on your own run. Only the person who started a run can see that browser or control it. What you type is held only until the browser applies it, then deleted, and never logged. After you log in, no more screenshots are saved publicly. Origin is built to stop before steps that publish, pay, delete or send, and refuses commands that publish, deploy or push."],
  ["Which models does it use?", "Muse Spark 1.3 watches the video and runs every step as an agent. Muse Voice Transcribe catches steps that are only spoken. SAM 3.1 outlines what was clicked, in the old video and on today's screen. Muse Spark Open picks the right element when several look alike. Muse Image draws the step cards for creators."],
  ["Is it free?", "Yes, during the hackathon. Every run uses real compute, so only a few runs go at once and a few start each hour."],
  ["What if it gets it wrong?", "Every run is public with its steps and terminal output. You can open any step and judge it yourself. Runs are never edited: wrong verdicts found by hand are labelled on the results page and logged with their fix."],
  ["How long does a run take?", "Usually 10 to 25 minutes: Muse Spark watches the video first, then each step runs in turn. The run page shows exactly where it is."],
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
                <li><b>Point</b><span>SAM 3.1 outlines what was clicked in the old video, then finds the same thing on today&apos;s screen.</span></li>
                <li><b>Run</b><span>Every step runs for real: terminal steps in an isolated container, website steps in a real browser, Blender steps in today&apos;s Blender. Each is marked works, changed or broken.</span></li>
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
