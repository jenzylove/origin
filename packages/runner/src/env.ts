import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// Local dev reads the repo .env; in CI the values come from Actions secrets.
const dotenv = resolve(import.meta.dirname, "../../../.env");
if (existsSync(dotenv)) {
  for (const line of readFileSync(dotenv, "utf8").split(/\r?\n/)) {
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]!] === undefined) process.env[m[1]!] = m[2]!;
  }
}

export function need(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}
