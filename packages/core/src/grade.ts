import type { Grade } from "./types.js";

export interface CommandResult {
  command: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

const ANSI = /\u001b\[[0-9;]*[A-Za-z]/g;

function commandTokens(command: string): Set<string> {
  const set = new Set<string>();
  for (const raw of command.split(/[\s;&|"'`()]+/)) {
    const t = raw.toLowerCase();
    if (!t || t.startsWith("-")) continue;
    set.add(t);
    // strip a version suffix (pkg@1.2.3, pkg@latest) but keep scoped @scope/pkg
    const at = t.lastIndexOf("@");
    if (at > 0) set.add(t.slice(0, at));
  }
  return set;
}

const NPM_DEPRECATED = /npm (?:warn|WARN) deprecated (@?[^\s@]+(?:\/[^\s@]+)?)@(\S+?):/;

export function gradeCommand(r: CommandResult): Grade {
  const clean = (s: string) => (s ?? "").replace(ANSI, "").replace(/\r/g, "");
  const nonEmpty = [...clean(r.stdout).split("\n"), ...clean(r.stderr).split("\n")]
    .map((l) => l.trim())
    .filter(Boolean);

  if (r.exitCode !== 0) {
    return { verdict: "broken", reasons: [`exit code ${r.exitCode}`, ...lastError(nonEmpty)] };
  }

  const tokens = commandTokens(r.command);
  const mentions = (name: string) => name.length >= 3 && tokens.has(name.toLowerCase());
  const reasons: string[] = [];
  let transitive = 0;

  for (const line of nonEmpty) {
    const npm = NPM_DEPRECATED.exec(line);
    if (npm) {
      const pkg = npm[1]!;
      if (mentions(pkg)) reasons.push(`${pkg}@${npm[2]} is deprecated`);
      else transitive++;
      continue;
    }
    for (const m of line.matchAll(/(@?\w[\w@/.-]*)\s+(?:is|has been|are)\s+deprecated/gi)) {
      if (mentions(m[1]!)) reasons.push(`${m[1]} is deprecated`);
    }
    if (/EBADENGINE/.test(line)) reasons.push("engine mismatch (EBADENGINE)");
    if (/DeprecationWarning/.test(line)) reasons.push(`Node deprecation: ${line.slice(0, 160)}`);
    if (/no longer supported|end[- ]of[- ]life/i.test(line)) {
      const hit = line.toLowerCase().split(/[^\w@/.-]+/).find((w) => mentions(w));
      if (hit) reasons.push(`${hit}: ${line.slice(0, 160)}`);
    }
  }

  const unique = [...new Set(reasons)];
  const out = [...unique];
  if (transitive > 0) out.push(`${transitive} transitive deprecation warnings (ignored)`);
  return { verdict: unique.length > 0 ? "changed" : "works", reasons: out };
}

function lastError(lines: string[]): string[] {
  const noise = /^npm notice|complete log of this run/i;
  const useful = lines.filter((l) => !noise.test(l));
  for (let i = useful.length - 1; i >= 0; i--) {
    if (/error|err!|fatal|not found|failed|cannot|denied|no such|unable|invalid/i.test(useful[i]!)) {
      return [useful[i]!];
    }
  }
  const last = useful[useful.length - 1];
  return last ? [last] : [];
}
