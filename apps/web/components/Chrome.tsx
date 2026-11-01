import Link from "next/link";

export function Header() {
  return (
    <header className="wrap header">
      <Link href="/" className="brand">Origin</Link>
      <nav className="nav">
        <Link href="/results">Results</Link>
        <a href="https://github.com/jenzylove/origin">GitHub</a>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="wrap footer">
      <div>
        <strong>Origin</strong>
        Built for the Meta Global AI Developer Hackathon.
      </div>
      <nav>
        <Link href="/results">Results</Link>
        <a href="https://github.com/jenzylove/origin">GitHub</a>
      </nav>
    </footer>
  );
}
