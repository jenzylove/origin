# Spike: Muse Spark 1.3 as the agent that runs a step (Nov 1 2026)

**Question:** Does Spark call tools reliably, and does it treat a warning laden success as a problem without being told the answer?

**Run 1:** Chat Completions with one `exec` tool. Prompt: "Tutorial step 5: npx create-react-app my-first-react-app --use-npm. Run it." Result in 4.3 s: one `exec` call with exactly that command, arguments as valid JSON.

**Run 2:** Tools `exec` and `grade_step` (works / changed / broken, with `replacement_command` that must pass first). Fed back the real Create React App output from the Modal spike (exit 0, three transitive `npm warn deprecated` lines, "create-react-app is deprecated.", "Success!").

Spark replied: "Your 2021 step ran, but with deprecation warnings. I'll verify the modern replacement." Its next action was an `exec` inspecting the result and the toolchain (`ls`, `package.json`, `node --version`, `npm --version`) before deciding. It did not grade "works" on the exit code.

**Verdict:** PASS. Spark drives the loop with tools and reads warnings on its own. Our deterministic `gradeCommand` stays as a second opinion so a verdict never rests on the model alone.
