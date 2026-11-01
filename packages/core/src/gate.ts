import type { Step } from "./types.js";

// Steps with real side effects outside the sandbox are never executed.
const GATED: RegExp[] = [
  /\btweet(?:s|ing)?\b/i,
  /\bpost(?!-)\b/i,
  /\bsend(?:s|ing)?\b/i,
  /\bpay(?:s|ing|ment)?\b/i,
  /\bbuy(?:ing)?\b/i,
  /\bpurchase\b/i,
  /\bcheck\s?out\b/i,
  /\bplace (?:an? |the |your )?order\b/i,
  /\bunpublish\b/i,
  /\bpublicly\b/i,
  /\bshare\b.*\b(?:twitter|linkedin|facebook|instagram|social|public)\b/i,
  /\bsubscribe\b.*\b(?:pay|paid|plan|premium|pro|billing|card|\$\d)/i,
  /\bsubmit\b.*\bform\b/i,
  /\b(?:delete|remove|destroy|drop)\b.*\b(?:account|repo|repository|project|workspace|database|bucket|organization)\b/i,
  /\b(?:delete|remove|destroy)\b.*\bpermanent(?:ly)?\b/i,
  /\bpermanent(?:ly)?\b.*\b(?:delete|remove|destroy)\b/i,
  /\bgh repo delete\b/i,
  /\bgit push\b.*--delete\b/i,
  /\bnpm deprecate\b/i,
];

function publishes(text: string): boolean {
  return /\bpublish\b/i.test(text) && !/--dry-run\b/i.test(text);
}

/** True when running the step would have an effect outside the local sandbox. */
export function isGatedStep(step: Pick<Step, "detail" | "target">): boolean {
  const text = `${step.detail ?? ""}\n${step.target ?? ""}`;
  return publishes(text) || GATED.some((re) => re.test(text));
}
