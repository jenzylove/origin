import { notFound } from "next/navigation";
import { getRun, getSteps } from "@/lib/data";
import { runName, shortDate } from "@/lib/format";
import { Footer, Header } from "@/components/Chrome";
import { CopyBox } from "@/components/CopyBox";

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
      <main className="wrap section creator">
        <div className="eyebrow">For the creator of {runName(run)}</div>
        {first ? (
          <h1 className="h2">Your video {first.verdict === "broken" ? "breaks" : "changes"} at <em>{first.t_label}</em>.</h1>
        ) : (
          <h1 className="h2">{failed ? "This run did not finish." : done ? <>No checked step <em>changed</em>.</> : "This run has not finished yet."}</h1>
        )}
        <p className="lede">
          {failed
            ? "Origin could not finish checking this tutorial, so there is nothing to tell your viewers yet."
            : `Origin checked ${ranCount} of ${all.length} steps on today's software${checked ? ` on ${checked}` : ""}.`}{" "}
          {steps.length ? `${steps.length} ${steps.length > 1 ? "steps need" : "step needs"} a note for your viewers.` : ""}{" "}
          <a href={`/run/${id}`}>See the full run</a>.
        </p>

        {steps.map((s) => {
          const comment = `Heads up for anyone following along today: at ${s.t_label}, ${s.verdict === "broken" ? "this step no longer works" : "this step has changed"}.${
            s.replacement ? ` Instead of "${s.detail.split("\n")[0]}", use: ${s.replacement.split("\n")[0]}` : ` ${(s.reasons?.[0] ?? "").split(/[;.]\s/)[0]}.`
          } Checked by actually running it: ${SITE}/run/${id}`;
          return (
            <section key={s.idx} className="creator-step">
              <div className="creator-head">
                <span className="time">{s.t_label}</span>
                <span className={`chip v-${s.verdict}`}>{s.verdict}</span>
              </div>
              <pre className="detail">{s.detail}</pre>
              {s.replacement && (
                <div className="today"><div className="lab">Today&apos;s way</div><pre>{s.replacement}</pre></div>
              )}
              <div className="lab">Comment to pin</div>
              <CopyBox text={comment} />
              {cards[String(s.idx)] && (
                <figure className="card">
                  <img src={cards[String(s.idx)]} alt={`Step card for ${s.t_label}, drawn by Muse Image`} loading="lazy" />
                  <figcaption>Card drawn by Muse Image. <a href={cards[String(s.idx)]} download>Download</a></figcaption>
                </figure>
              )}
            </section>
          );
        })}
      </main>
      <Footer />
    </>
  );
}
