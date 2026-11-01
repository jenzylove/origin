import { spawn, execFileSync } from "node:child_process";
import { copyFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface ExecResult { exitCode: number; stdout: string; stderr: string; cwd: string; timedOut: boolean }

export interface Sandbox {
  exec(command: string, opts?: { timeoutMs?: number; background?: boolean }): Promise<ExecResult>;
  /** Copy a file out of the sandbox to this machine. */
  copyOut(path: string, hostPath: string): Promise<void>;
  close(): Promise<void>;
}

const CWD_MARK = "__ORIGIN_CWD__=";

function run(argv: string[], timeoutMs: number): Promise<{ code: number; out: string; err: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const p = spawn(argv[0]!, argv.slice(1), { stdio: ["ignore", "pipe", "pipe"] });
    let out = "", err = "", timedOut = false;
    const cap = 1_000_000;
    p.stdout.on("data", (d) => { if (out.length < cap) out += d; });
    p.stderr.on("data", (d) => { if (err.length < cap) err += d; });
    const timer = setTimeout(() => { timedOut = true; p.kill("SIGKILL"); }, timeoutMs);
    p.on("close", (code) => { clearTimeout(timer); resolve({ code: code ?? 124, out, err, timedOut }); });
  });
}

const sq = (s: string) => `'${s.replace(/'/g, `'\\''`)}'`;

/** Wraps each command so the working directory carries over between calls, like a terminal. */
abstract class ShellSandbox implements Sandbox {
  protected cwd: string;
  constructor(cwd: string) { this.cwd = cwd; }
  protected abstract argv(script: string): string[];
  abstract close(): Promise<void>;
  abstract copyOut(path: string, hostPath: string): Promise<void>;

  async exec(command: string, opts: { timeoutMs?: number; background?: boolean } = {}): Promise<ExecResult> {
    const timeoutMs = opts.timeoutMs ?? 600_000;
    const body = opts.background
      ? `nohup bash -lc ${sq(command)} > /tmp/bg.log 2>&1 &\nsleep 20; tail -c 3000 /tmp/bg.log`
      : command;
    const script = `cd ${sq(this.cwd)} || exit 1\n${body}\ncode=$?\necho\necho "${CWD_MARK}$(pwd)"\nexit $code`;
    const r = await run(this.argv(script), timeoutMs);
    const lines = r.out.split("\n");
    const markAt = lines.findLastIndex((l) => l.startsWith(CWD_MARK));
    if (markAt >= 0) {
      this.cwd = lines[markAt]!.slice(CWD_MARK.length).trim();
      lines.splice(markAt, 1);
      // Drop the blank line added so the marker always starts its own line.
      if (markAt > 0 && lines[markAt - 1] === "") lines.splice(markAt - 1, 1);
    }
    return { exitCode: r.timedOut ? 124 : r.code, stdout: lines.join("\n"), stderr: r.err, cwd: this.cwd, timedOut: r.timedOut };
  }
}

/** CI: a fresh Debian container per run. No host environment variables, and so no secrets, enter it. */
export class DockerSandbox extends ShellSandbox {
  private constructor(private name: string) { super("/work"); }

  static async create(image = "node:22-bookworm"): Promise<DockerSandbox> {
    const name = `origin-${Date.now()}`;
    // Host network so the browser can reach the tutorial's dev server on localhost.
    // Limits keep a runaway tutorial from taking the machine down; no environment variables pass in.
    execFileSync("docker", ["run", "-d", "--name", name, "-w", "/work", "--network", "host",
      "--memory", "6g", "--cpus", "3", "--pids-limit", "2048", "--security-opt", "no-new-privileges",
      image, "sleep", "infinity"]);
    return new DockerSandbox(name);
  }

  protected argv(script: string) { return ["docker", "exec", this.name, "bash", "-lc", script]; }
  async copyOut(path: string, hostPath: string) { execFileSync("docker", ["cp", `${this.name}:${path}`, hostPath]); }
  async close() { try { execFileSync("docker", ["rm", "-f", this.name]); } catch { /* already gone */ } }
}

/** Local development only: a temp directory on this machine. */
export class LocalSandbox extends ShellSandbox {
  constructor() { super(mkdtempSync(join(tmpdir(), "origin-")).replace(/\\/g, "/")); }
  protected argv(script: string) { return ["bash", "-lc", script]; }
  async copyOut(path: string, hostPath: string) { copyFileSync(path, hostPath); }
  async close() {}
}
