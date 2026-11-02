import Link from "next/link";
import { notFound } from "next/navigation";
import { getRun, getSteps } from "@/lib/data";
import { runName, shortDate } from "@/lib/format";
import { Footer, Header } from "@/components/Chrome";
import { CopyBox } from "@/components/CopyBox";
import { Pill } from "@/components/Pill";
import { plainStep } from "@/lib/steps";

export const dynamic = "force-dynamic";

const SITE = "https://origin-two-zeta.vercel.app";

// For the person who made the video: where it breaks, a comment to pin, and a card to post.
export default async function CreatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const run = await getRun(id);
  if (!run) notFound();
  // Steps Origin could not finish checking are not claims, so they get no note for viewers.
  const steps = (await getSteps(id)).filter((s) => (s.verdict === "changed" || s.verdict === "broken")
    && !(s.reasons?.[0] ?? "").startsWith("Origin could not"));
  const cards = (run.summary as { cards?: Record<string, string> } | null)?.cards ?? {};
  const first = steps[0];
  const checked = run.finished_at ? shortDate(run.finished_at) : "";
  const all = await getSteps(id);
  const ranCount = all.filter((s) => s.verdict === "works" || s.verdict === "changed" || s.verdict === "broken").length;
  const failed = run.status === "failed";
  const done = run.status === "done";

  return (
    <>
      <Header />
      <main className="wrap creator">
        <Link href={`/run/${id}`} className="back">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M8.5 3 4.5 7l4 4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back to the run
        </Link>
        <p className="label">For the creator of {runName(run)}</p>
        {first ? (
          <h1 className="run-title"><span className="tone">Your video {first.verdict === "broken" ? "breaks" : "changes"} at</span> {first.t_label}.</h1>
        ) : (
          <h1 className="run-title">{failed ? "This run did not finish." : done ? <><span className="tone">No checked step</span> changed.</> : "This run has not finished yet."}</h1>
        )}
        <p className="body-lg creator-lede">
          {failed
            ? "Origin could not finish checking this tutorial, so there is nothing to tell your viewers yet."
            : `Origin checked ${ranCount} of ${all.length} steps on today's software${checked ? ` on ${checked}` : ""}.`}{" "}
          {steps.length ? `${steps.length} ${steps.length > 1 ? "steps need" : "step needs"} a note for your viewers.` : ""}{" "}
          <Link href={`/run/${id}`}>See the full run</Link>.
        </p>

        <div className="creator-list">
          {steps.map((s) => {
            const comment = `Heads up for anyone following along today: at ${s.t_label}, ${s.verdict === "broken" ? "this step no longer works" : "this step has changed"}.${
              s.replacement ? ` Instead of "${s.detail.split("\n")[0]}", use: ${s.replacement.split("\n")[0]}` :` ${(s.reasons?.[0] ?? "").split(/[;.]\s/)[0]}.`
            } Checked by actually running it: ${SITE}/run/${id}`;
            const { text, code } = plainStep(s);
            return (
              <section key={s.idx} className="creator-step" data-reveal>
                <div className="creator-text">
                  <div className="creator-head">
                    <span className="step-time">{s.t_label}</span>
                    <Pill v={s.verdict ?? "pending"} />
                  </div>
                  <p className={`creator-what ${code ? "is-code" : ""}`}>{text}</p>
                  {s.replacement && (
                    <div className="today"><span className="today-lab">Today&apos;s way</span><code>{s.replacement}</code></div>
                  )}
                  <span className="today-lab">Comment to pin</span>
                  <CopyBox text={comment} />
                </div>
                {cards[String(s.idx)] && (
                  <figure className="card">
                    <img src={cards[String(s.idx)]} alt={`Step card for ${s.t_label}, drawn by Muse Image`} loading="lazy" />
                    <figcaption>Card drawn by Muse Image. <a href={cards[String(s.idx)]} download>Download</a></figcaption>
                  </figure>
                )}
              </section>
            );
          })}
        </div>
      </main>
      <Footer />
    </>
  );
}
