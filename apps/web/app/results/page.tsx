import Link from "next/link";
import { listRuns, stepsByRun } from "@/lib/data";
import { countVerdicts, runName, shortDate } from "@/lib/format";
import { Footer, Header } from "@/components/Chrome";
import { KNOWN_MISSES, MISSES_URL } from "@/lib/misses";
import type { Run } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata = { title: "Results" };

const KIND: Record<string, string> = { code: "Terminal", web: "Website", blender: "Blender" };

function status(r: Run): string | null {
  return { queued: "Queued", extracting: "Watching the video", running: "Running now", waiting_user: "Waiting for a login", failed: "Did not finish", done: null }[r.status];
}

export default async function Results() {
  let error: string | null = null;
  const runs = await listRuns().catch((e) => {
    error = String(e instanceof Error ? e.message : e);
    return [];
  });
  const steps = await stepsByRun(runs.map((r) => r.id)).catch(() => ({}));

  return (
    <>
      <Header />
      <main className="wrap results-page">
        <p className="label">Results</p>
        <h1 className="run-title"><span className="tone">Every run,</span> in the open.</h1>
        <p className="body-lg results-lede">Each row is a real run. Open one to see its steps and what ran. Runs are never edited: wrong verdicts found by hand are labelled here and listed with their fix in the <a href={MISSES_URL}>misses log</a>.</p>

        {error && <p className="msg-err"><span className="msg-dot" aria-hidden="true" />Could not load runs right now.</p>}
        {!error && runs.length === 0 && <p className="empty">No runs yet.</p>}
        {runs.length > 0 && (
          <ol className="results">
            {runs.map((r) => {
              const c = countVerdicts((steps as Record<string, never[]>)[r.id] ?? []);
              const total = Object.values(c).reduce((a, b) => a + b, 0);
              const w = c.works ?? 0, ch = c.changed ?? 0, b = c.broken ?? 0;
              const other = total - w - ch - b;
              const st = status(r);
              const parts = [b && `${b} broken`, ch && `${ch} changed`, w && `${w} work`].filter(Boolean).join(", ");
              return (
                <li key={r.id} className="result" data-reveal>
                  <Link href={`/run/${r.id}`} className="result-link">
                    <span className="result-main">
                      <span className="result-title">{runName(r)}</span>
                      <span className="result-meta">
                        {[r.kind && KIND[r.kind], shortDate(r.created_at), total ? `${total} steps` : null].filter(Boolean).join(" · ")}
                      </span>
                      {KNOWN_MISSES[r.id] && <span className="miss">Known miss: {KNOWN_MISSES[r.id]}</span>}
                    </span>
                    <span className="result-side">
                      {total > 0 ? (
                        <>
                          <span className="bar bar-sm" aria-hidden="true">
                            {w > 0 && <span className="bar-seg b-works" style={{ flexGrow: w }} />}
                            {ch > 0 && <span className="bar-seg b-changed" style={{ flexGrow: ch }} />}
                            {b > 0 && <span className="bar-seg b-broken" style={{ flexGrow: b }} />}
                            {other > 0 && <span className="bar-seg b-other" style={{ flexGrow: other }} />}
                          </span>
                          <span className="result-counts">{st ?? (parts || "Not checked")}</span>
                        </>
                      ) : (
                        <span className="result-counts">{st ?? "No steps"}</span>
                      )}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        )}
      </main>
      <Footer />
    </>
  );
}
