import { gradeCommand, isGatedStep, type Step, type Verdict } from "@origin/core";
import { sparkChat, type ChatMessage } from "./meta.js";
import { dataUrl } from "./meta.js";
import type { Sandbox, ExecResult } from "./sandbox.js";
import type { Browser, Shot } from "./browser.js";
import { Blender } from "./blender.js";

export interface StepResult {
  verdict: Verdict;
  reasons: string[];
  replacement?: string;
  output: string;
  execs: Array<{ command: string; exitCode: number }>;
  /** Today's screen for this step, with the element outlined when one was found. */
  now?: Shot;
}

export type Emit = (kind: string, payload: object) => Promise<void>;

const tail = (s: string, n = 3500) => (s.length > n ? "…" + s.slice(-n) : s);

const TOOLS = [
  { type: "function", function: {
    name: "exec",
    description: "Run a bash command in the Linux sandbox (Debian, Node 22, npm, git, curl, internet). The working directory carries over between calls. Use background=true for commands that never exit, like dev servers; it returns the first 20 seconds of output.",
    parameters: { type: "object", properties: { command: { type: "string" }, background: { type: "boolean" } }, required: ["command"] } } },
  { type: "function", function: {
    name: "browser_open",
    description: "Open a URL in a real Chromium browser (1280x720). You get a screenshot back.",
    parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] } } },
  { type: "function", function: {
    name: "browser_click",
    description: "Click an element on the current page. SAM 3.1 finds it from a short visual description on today's screenshot. You get a screenshot back.",
    parameters: { type: "object", properties: {
      target: { type: "string", description: "Short visual description, e.g. 'green download button', 'Docs link in the top menu'" },
      label: { type: "string", description: "The element's visible text, used if the description finds nothing" } },
      required: ["target"] } } },
  { type: "function", function: {
    name: "browser_type",
    description: "Click a field found by visual description and type text into it.",
    parameters: { type: "object", properties: { target: { type: "string" }, text: { type: "string" } }, required: ["target", "text"] } } },
  { type: "function", function: {
    name: "browser_key",
    description: "Press a key in the browser, e.g. Enter.",
    parameters: { type: "object", properties: { key: { type: "string" } }, required: ["key"] } } },
  { type: "function", function: {
    name: "blender_python",
    description: "Run Blender Python (bpy) against the tutorial's saved scene in today's Blender, headless. The scene is loaded before and saved after. Returns the output. Use it to do each Blender step the tutorial shows in the UI.",
    parameters: { type: "object", properties: { code: { type: "string" } }, required: ["code"] } } },
  { type: "function", function: {
    name: "blender_render",
    description: "Render the current Blender scene from its camera and see the image.",
    parameters: { type: "object", properties: {} } } },
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
Website steps (open a page, click, type) are done in the real browser with the browser tools, so today's screen is seen. For a click step, open the page it is on and use browser_click on the element as it looks today; do not jump to the destination URL. Describe click targets visually.
Blender steps: do what the tutorial does in the UI with blender_python in today's Blender. If a menu, operator, setting or default changed or was removed since the video, grade changed or broken and name today's equivalent. Render with blender_render when the step changes what the scene looks like.
Steps that install software on a desktop (download buttons, installers): look at today's page in the browser, then install the equivalent in the sandbox.
Commands that keep running (dev servers, watch modes, "npm run watch", "npm start") must use exec with background=true; judge them from the first output and any files they produce.
If a step is no longer needed today (for example a config file the tool no longer uses), grade it broken or changed and say so in the reason; leave replacement_command empty.
Never publish, post, pay, delete accounts, or send anything. Be fast: use few commands per step.`;

const LONG_RUNNING = /\b(npm|pnpm|yarn|bun)\s+(run\s+)?(start|dev|serve|watch|preview)\b|^\s*(npx\s+)?(vite|nodemon|http-server|live-server|next\s+dev)(\s|$)|--watch\b/;
const STEP_BUDGET_MS = 6 * 60_000;
const RUN_BUDGET_MS = 40 * 60_000;

interface Graded { verdict: string; reason: string; replacement_command?: string }

export async function runSteps(
  steps: Step[], context: string, sb: Sandbox, work: string, openBrowser: () => Promise<Browser>, emit: Emit,
  onResult: (s: Step, r: StepResult) => Promise<void>,
): Promise<void> {
  const messages: ChatMessage[] = [{ role: "system", content: SYSTEM }, { role: "user", content: context }];
  let browser: Browser | null = null;
  let blender: Blender | null = null;

  // Only the latest screenshot stays in the conversation; older ones are dropped to save context.
  const showScreen = (shot: Shot) => {
    for (const m of messages) {
      if (Array.isArray(m.content) && m.content.some((c: any) => c.type === "image_url")) m.content = "[earlier screenshot removed]";
    }
    messages.push({ role: "user", content: [
      { type: "text", text: `Screenshot after that action. ${shot.note}` },
      { type: "image_url", image_url: { url: dataUrl(shot.after, shot.after.endsWith(".png") ? "image/png" : "image/jpeg") } },
    ] });
  };

  const runStart = Date.now();
  for (const step of steps) {
    if (Date.now() - runStart > RUN_BUDGET_MS) {
      await onResult(step, { verdict: "skipped", reasons: ["Origin ran out of time for this run before reaching this step."], output: "", execs: [] });
      continue;
    }
    if (isGatedStep(step)) {
      await onResult(step, { verdict: "gated", reasons: ["This step publishes, pays, deletes or sends. Origin stops here for you."], output: "", execs: [] });
      continue;
    }
    await emit("step_start", { index: step.index });
    messages.push({ role: "user", content: `Step ${step.index + 1} at ${step.tLabel} (${step.action}): ${step.detail}` });

    const execs: Array<{ command: string; result: ExecResult }> = [];
    let graded: Graded | null = null;
    let now: Shot | undefined;
    const reasonsExtra: string[] = [];

    const stepStart = Date.now();
    for (let turn = 0; turn < 14 && !graded; turn++) {
      if (Date.now() - stepStart > STEP_BUDGET_MS && turn < 11) turn = 11;
      if (turn === 11) messages.push({ role: "user", content: "You are nearly out of time for this step. Call grade_step now with what you have seen." });
      const { message } = await sparkChat(messages, TOOLS);
      messages.push({ role: "assistant", content: message.content ?? null, tool_calls: message.tool_calls });
      if (message.content) await emit("thought", { index: step.index, text: String(message.content).slice(0, 400) });
      if (!message.tool_calls?.length) {
        messages.push({ role: "user", content: "Call a tool or grade_step." });
        continue;
      }
      for (const call of message.tool_calls) {
        const args = JSON.parse(call.function.arguments || "{}");
        if (call.function.name === "exec") {
          await emit("exec_start", { index: step.index, command: args.command });
          // Servers and watchers never exit; run them in the background whatever was asked.
          const background = !!args.background || LONG_RUNNING.test(args.command);
          const result = await sb.exec(args.command, { background, timeoutMs: 300_000 });
          execs.push({ command: args.command, result });
          await emit("exec_done", { index: step.index, command: args.command, exitCode: result.exitCode, output: tail(result.stdout + result.stderr, 1500) });
          messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({
            exit_code: result.exitCode, timed_out: result.timedOut, cwd: result.cwd,
            stdout: tail(result.stdout), stderr: tail(result.stderr, 1500) }) });
        } else if (call.function.name.startsWith("browser_")) {
          const what = [args.url, args.target, args.label, args.text, args.key].filter(Boolean).join(" ");
          if (isGatedStep({ ...step, detail: what })) {
            messages.push({ role: "tool", tool_call_id: call.id, content: "refused: this would publish, pay, delete or send. Origin stops here for the user." });
            continue;
          }
          await emit("browse", { index: step.index, tool: call.function.name, what });
          browser ??= await openBrowser();
          const shot = call.function.name === "browser_open" ? await browser.open(args.url)
            : call.function.name === "browser_click" ? await browser.click(args.target, args.label ?? "", step.detail)
            : call.function.name === "browser_type" ? await browser.type(args.target, args.text, step.detail)
            : await browser.key(args.key);
          if (shot.box || !now?.box) now = shot;
          await emit("browse_done", { index: step.index, note: shot.note, found: !!shot.box });
          messages.push({ role: "tool", tool_call_id: call.id, content: shot.note });
          showScreen(shot);
        } else if (call.function.name === "blender_python") {
          blender ??= new Blender(sb, work);
          await emit("exec_start", { index: step.index, command: `blender: ${String(args.code).split(String.fromCharCode(10))[0]!.slice(0, 120)}` });
          const result = await blender.python(args.code);
          execs.push({ command: `blender_python: ${args.code}`, result });
          await emit("exec_done", { index: step.index, command: "blender_python", exitCode: result.exitCode, output: tail(result.stdout + result.stderr, 1500) });
          messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify({ exit_code: result.exitCode, saved: result.stdout.includes("ORIGIN_SAVED"), output: tail(result.stdout + result.stderr) }) });
        } else if (call.function.name === "blender_render") {
          blender ??= new Blender(sb, work);
          await emit("exec_start", { index: step.index, command: "blender: render" });
          const r = await blender.render();
          await emit("browse_done", { index: step.index, note: r.note, found: !!r.path });
          messages.push({ role: "tool", tool_call_id: call.id, content: r.note });
          if (r.path) {
            now = { path: r.path, after: r.path, box: null, width: 960, height: 540, note: r.note };
            showScreen(now);
          }
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

    // Then vs now: for a click step, look for the tutorial's element on today's page ourselves.
    if (step.action === "click" && step.target && browser && !now?.box) {
      try { now = await browser.locate(step.target, step.detail); } catch (e) { console.warn(`locate: ${e}`); }
      if (now && !now.box) reasonsExtra.push(now.note);
    }

    // A second, rule based opinion on the step's own command; the worse verdict wins.
    const own = execs.findLast((e) => e.command.includes(step.detail.trim())) ?? execs[0];
    const rule = own ? gradeCommand({ command: own.command, exitCode: own.result.exitCode, stdout: own.result.stdout, stderr: own.result.stderr }) : null;
    const g = graded as Graded | null;
    let verdict = (g?.verdict ?? "broken") as Verdict;
    const reasons = [g?.reason ?? "Origin could not finish checking this step."];
    // The rule check only catches deprecations Spark let through; exit codes are Spark's call in context.
    if (rule?.verdict === "changed" && verdict === "works") verdict = "changed";
    if (rule) reasons.push(...rule.reasons.map((r) => `Output check: ${r}`));
    reasons.push(...reasonsExtra);

    await onResult(step, {
      verdict, reasons,
      replacement: g?.replacement_command,
      output: tail(execs.map((e) => `$ ${e.command}\n${e.result.stdout}${e.result.stderr}`).join("\n"), 6000),
      execs: execs.map((e) => ({ command: e.command, exitCode: e.result.exitCode })),
      now,
    });
  }
  await browser?.close();
}
