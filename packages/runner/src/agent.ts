import { gradeCommand, isGatedStep, type Step, type Verdict } from "@origin/core";
import { sparkChat, type ChatMessage } from "./meta.js";
import type { Sandbox, ExecResult } from "./sandbox.js";

export interface StepResult {
  verdict: Verdict;
  reasons: string[];
  replacement?: string;
  output: string;
  execs: Array<{ command: string; exitCode: number }>;
}

export type Emit = (kind: string, payload: object) => Promise<void>;

const tail = (s: string, n = 3500) => (s.length > n ? "…" + s.slice(-n) : s);

const TOOLS = [
  { type: "function", function: {
    name: "exec",
    description: "Run a bash command in the Linux sandbox (Debian, Node 22, npm, git, curl, internet). The working directory carries over between calls. Use background=true for commands that never exit, like dev servers; it returns the first 20 seconds of output.",
    parameters: { type: "object", properties: { command: { type: "string" }, background: { type: "boolean" } }, required: ["command"] } } },
  { type: "function", function: {
    name: "grade_step",
    description: "Record the verdict for the current tutorial step. works = runs as taught and is still the current way. changed = runs but is deprecated, end of life, or no longer the recommended way. broken = fails today.",
    parameters: { type: "object", properties: {
      verdict: { type: "string", enum: ["works", "changed", "broken"] },
      reason: { type: "string", description: "One or two plain sentences a learner understands, citing the output you saw." },
      replacement_command: { type: "string", description: "For changed or broken: today's way, exactly as you ran it with exec and it passed." } },
      required: ["verdict", "reason"] } } },
];

const SYSTEM = `You are Origin. You re-run a software tutorial, step by step, on today's software, inside a Linux sandbox.
For each step: run it as the tutorial teaches, read the output carefully (deprecation and end of life warnings matter, not only exit codes), then call grade_step.
If the step is changed or broken, find today's recommended way (check official sources with curl when unsure, for example https://nodejs.org/dist/index.json for Node releases), run it with exec, and only give a replacement_command that you actually ran and that passed.
When a later step depends on an earlier one that you replaced, continue on top of your replacement so the tutorial still reaches its goal.
Steps that install software on a desktop (download buttons, installers) are done in the sandbox the equivalent way.
Commands that keep running (dev servers, watch modes, "npm run watch", "npm start") must use exec with background=true; judge them from the first output and any files they produce.
If a step is no longer needed today (for example a config file the tool no longer uses), grade it broken or changed and say so in the reason; leave replacement_command empty.
Never publish, post, pay, delete accounts, or send anything. Be fast: use few commands per step.`;

const rank: Record<string, number> = { works: 0, changed: 1, broken: 2 };

interface Graded { verdict: string; reason: string; replacement_command?: string }

export async function runCodeSteps(
  steps: Step[], context: string, sb: Sandbox, emit: Emit,
  onResult: (s: Step, r: StepResult) => Promise<void>,
): Promise<void> {
  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM }, { role: "user", content: context }];

  for (const step of steps) {
    if (isGatedStep(step)) {
      await onResult(step, { verdict: "gated", reasons: ["This step publishes, pays, deletes or sends. Origin stops here for you."], output: "", execs: [] });
      continue;
    }
    await emit("step_start", { index: step.index });
    messages.push({ role: "user", content: `Step ${step.index + 1} at ${step.tLabel} (${step.action}): ${step.detail}` });

    const execs: Array<{ command: string; result: ExecResult }> = [];
    let graded: Graded | null = null;

    for (let turn = 0; turn < 14 && !graded; turn++) {
      if (turn === 11) messages.push({ role: "user", content: "You are nearly out of time for this step. Call grade_step now with what you have seen." });
      const { message } = await sparkChat(messages, TOOLS);
      messages.push({ role: "assistant", content: message.content ?? null, tool_calls: message.tool_calls });
      if (message.content) await emit("thought", { index: step.index, text: String(message.content).slice(0, 400) });
      if (!message.tool_calls?.length) {
        messages.push({ role: "user", content: "Call exec or grade_step." });
        continue;
      }
      for (const call of message.tool_calls) {
        const args = JSON.parse(call.function.arguments || "{}");
        if (call.function.name === "exec") {
          await emit("exec_start", { index: step.index, command: args.command });
          const result = await sb.exec(args.command, { background: !!args.background, timeoutMs: 900_000 });
          execs.push({ command: args.command, result });
          await emit("exec_done", { index: step.index, command: args.command, exitCode: result.exitCode, output: tail(result.stdout + result.stderr, 1500) });
          messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({
            exit_code: result.exitCode, timed_out: result.timedOut, cwd: result.cwd,
            stdout: tail(result.stdout), stderr: tail(result.stderr, 1500) }) });
        } else if (call.function.name === "grade_step") {
          const rep = typeof args.replacement_command === "string" ? args.replacement_command.trim() : "";
          let note = "recorded";
          if (rep && !execs.some((e) => e.result.exitCode === 0 && e.command.includes(rep))) {
            note = "rejected: replacement_command was not run successfully with exec in this step. Run it first.";
          } else graded = args;
          messages.push({ role: "tool", tool_call_id: call.id, content: note });
        } else {
          messages.push({ role: "tool", tool_call_id: call.id, content: "unknown tool" });
        }
      }
    }

    // A second, rule based opinion on the step's own command; the worse verdict wins.
    const own = execs.find((e) => e.command.includes(step.detail.trim())) ?? execs[0];
    const rule = own ? gradeCommand({ command: own.command, exitCode: own.result.exitCode, stdout: own.result.stdout, stderr: own.result.stderr }) : null;
    const g = graded as Graded | null;
    let verdict = (g?.verdict ?? "broken") as Verdict;
    const reasons = [g?.reason ?? "Origin could not finish checking this step."];
    if (rule && rank[rule.verdict]! > rank[verdict]!) verdict = rule.verdict;
    if (rule) reasons.push(...rule.reasons.map((r) => `Output check: ${r}`));

    await onResult(step, {
      verdict, reasons,
      replacement: g?.replacement_command,
      output: tail(execs.map((e) => `$ ${e.command}\n${e.result.stdout}${e.result.stderr}`).join("\n"), 6000),
      execs: execs.map((e) => ({ command: e.command, exitCode: e.result.exitCode })),
    });
  }
}
