import type { Step } from "./types.js";

// Steps with real side effects outside the sandbox are never executed.
const GATED: RegExp[] = [
  /\btweet(?:s|ing)?\b/i,
  // "post" and "send" mean posting from an account, not HTTP verbs or blog posts.
  /(?<!-X\s)(?<!\bblog\s)\bpost\b(?!-)(?!\s+(?:request|requests|method|body|data|endpoint|route|handler|in\s+markdown))/i,
  /\bsend(?:s|ing)?\b(?!\s+(?:a\s+|the\s+)?(?:request|requests|get|post|data)\b)/i,
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
  // Account actions that grant, confirm or take away access.
  /\bauthori[sz]e\b/i,
  /\ballow\s+access\b/i,
  /\bgrant\b.*\b(?:access|permissions?)\b/i,
  /\bconfirm\b.*\b(?:purchase|payment|order|deletion|transfer|subscription)\b/i,
  /\brevoke\b/i,
  /\bregenerate\b.*\b(?:keys?|tokens?|secrets?)\b/i,
  /\btransfer\b.*\b(?:ownership|repo|repository|domain|funds|money)\b/i,
  /\bunfollow\b/i,
];

function publishes(text: string): boolean {
  return /\bpublish\b/i.test(text) && !/--dry-run\b/i.test(text);
}

/** True when running the step would have an effect outside the local sandbox. */
export function isGatedStep(step: Pick<Step, "detail" | "target">): boolean {
  const text = `${step.detail ?? ""}\n${step.target ?? ""}`;
  return publishes(text) || GATED.some((re) => re.test(text));
}

// Commands that publish, deploy, push or change something outside the sandbox.
const GATED_COMMANDS: RegExp[] = [
  /\b(?:npm|yarn|pnpm|bun)\s+publish\b(?!.*--dry-run)/i,
  /\btwine\s+upload\b/i,
  /\bcargo\s+publish\b(?!.*--dry-run)/i,
  /\bgem\s+push\b/i,
  /\bgh\s+(?:release\s+create|repo\s+delete|repo\s+create)\b/i,
  /\bgit\s+push\b/i,
  /\b(?:vercel|netlify|firebase|surge|fly|flyctl|railway|heroku|wrangler)\b.*\b(?:deploy|publish)\b/i,
  /\bvercel\b.*--prod\b/i,
  /\bcurl\b.*-X\s*(?:POST|PUT|PATCH|DELETE)\b(?!.*\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b)/i,
];

/** True when a terminal command would publish, deploy, push or change something outside the sandbox. */
export function isGatedCommand(command: string): boolean {
  return GATED_COMMANDS.some((re) => re.test(command));
}
