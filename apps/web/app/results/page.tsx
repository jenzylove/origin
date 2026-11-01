import Link from "next/link";
import { listRuns, stepsByRun } from "@/lib/data";
import { countVerdicts, runName, shortDate, statusLabel, VERDICTS } from "@/lib/format";
import { Footer, Header } from "@/components/Chrome";

export const dynamic = "force-dynamic";
export const metadata = { title: "Results | Origin" };

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
      <main className="wrap section">
        <p className="eyebrow">05 Proof</p>
        <h1 className="h2">Every run, in the <em>open</em>.</h1>
        <p className="lede">Each row is a real run. Open one to see its steps and the full terminal output.</p>

        {error && <p className="msg-err">Could not load runs: {error}</p>}
        {!error && runs.length === 0 && <p className="empty">No runs yet.</p>}
        {runs.length > 0 && (
          <div className="tbl-wrap">
            <table className="results">
              <thead>
                <tr>
                  <th>Tutorial</th>
                  <th className="hide-sm">Kind</th>
                  <th className="hide-sm">Date</th>
                  <th>Steps</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {runs.map((r) => {
                  const c = countVerdicts((steps as Record<string, never[]>)[r.id] ?? []);
                  const total = Object.values(c).reduce((a, b) => a + b, 0);
                  return (
                    <tr key={r.id}>
                      <td className="title"><Link href={`/run/${r.id}`}>{runName(r)}</Link></td>
                      <td className="hide-sm mono">{r.kind ?? "unknown"}</td>
                      <td className="hide-sm mono">{shortDate(r.created_at)}</td>
                      <td>
                        {total === 0 ? <span className="mono">none</span> : (
                          <div className="counts">
                            {VERDICTS.filter((v) => c[v]).map((v) => (
                              <span key={v} className={`chip v-${v}`}>{v} <b>{c[v]}</b></span>
                            ))}
                            {c.pending ? <span className="chip v-pending">pending <b>{c.pending}</b></span> : null}
                          </div>
                        )}
                      </td>
                      <td className="mono">{statusLabel(r)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
