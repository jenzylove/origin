import Link from "next/link";
import { MISSES_URL } from "@/lib/misses";

// The mark: a play button. Its back half is made of dots (the old video), its front half is
// solid (today's run), and a green spark sits at the tip where the old becomes the new.
const MARK_DOTS: Array<[number, number]> = [];
for (const x of [5, 8, 11]) for (let y = 4 + (x - 5) * 0.62; y <= 28 - (x - 5) * 0.62; y += 3) MARK_DOTS.push([x, y]);

export function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      {MARK_DOTS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.15" fill="currentColor" opacity="0.55" />)}
      <path d="M13 9.2 L27.5 16 L13 22.8 Z" fill="currentColor" />
      <circle cx="28.4" cy="16" r="2.6" fill="var(--works)" />
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
          <span>Every run is real and public.</span>
        </div>
        <p className="footer-word" aria-hidden="true">Origin</p>
      </div>
    </footer>
  );
}
