import Link from "next/link";
import { MISSES_URL } from "@/lib/misses";

// The mark: a ring (the old video) with a dot settling inside it (today's run).
export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
      <circle className="mark-dot" cx="12" cy="12" r="3" fill="var(--works)" />
    </svg>
  );
}

export function Header() {
  return (
    <header className="nav-shell">
      <nav className="nav" aria-label="Main">
        <Link href="/" className="brand" aria-label="Origin home">
          <Mark />
          <span>Origin</span>
        </Link>
        <div className="nav-links">
          <Link href="/#how">How it works</Link>
          <Link href="/results">Results</Link>
          <Link href="/#creators">Creators</Link>
        </div>
        <Link href="/#start" className="pill pill-dark pill-sm">Run a tutorial</Link>
      </nav>
    </header>
  );
}

const BUILT_WITH = ["Muse Spark 1.3", "SAM 3.1", "Muse Voice Transcribe", "Muse Spark Open", "Muse Image"];

export function Footer() {
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link href="/" className="brand brand-lg"><Mark size={28} /><span>Origin</span></Link>
            <p>Tutorials age. Origin runs them today.</p>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              <li><Link href="/#how">How it works</Link></li>
              <li><Link href="/results">Results</Link></li>
              <li><Link href="/#creators">Creators</Link></li>
            </ul>
          </div>
          <div>
            <h4>Built with</h4>
            <ul>{BUILT_WITH.map((b) => <li key={b}>{b}</li>)}</ul>
          </div>
          <div>
            <h4>Project</h4>
            <ul>
              <li><a href="https://github.com/jenzylove/origin">GitHub</a></li>
              <li><a href={MISSES_URL}>Misses log</a></li>
            </ul>
          </div>
        </div>
        <div className="footer-base">
          <span>Built for the Meta Global AI Developer Hackathon, 2026.</span>
        </div>
      </div>
    </footer>
  );
}
