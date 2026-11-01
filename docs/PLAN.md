# Origin: Build Plan

**Deadline:** Nov 4, 2026, 9:00 PM ET = Nov 5, 02:00 UTC = Nov 5, 03:00 Lagos.
**Internal target:** everything submitted by Nov 4, 22:00 Lagos, leaving 5 hours of slack.

## Architecture

| Part | Runs on | Why |
|---|---|---|
| Site (paste box, live panel, fixed guide, creator view, results) | Next.js on Vercel | Fast deploy, stable URL for judges |
| Orchestrator (the agent loop, one job per tutorial) | Modal function, spawned per run | Runs take minutes; Vercel functions time out |
| Code runner | Modal Sandbox (Debian, Node, Python) | Fresh, sealed box per run; proven in spike |
| Web runner | Playwright + Chromium in a Modal Sandbox | Real clicks, a screenshot per step |
| Blender runner | Blender headless in a Modal Sandbox, driven by `bpy` | Rebuilds the scene by script and renders |
| Account runner | Cloud browser streamed to the user, who logs in themselves | Origin never sees a password; stops at publish or pay |
| Run state, live events, frames, screenshots | Supabase (Postgres, Realtime, Storage) | The live panel subscribes to events as they land |
| Brain | Meta Model API: `muse-spark-1.3` (watch, plan, act, repair), `sam-3.1` (click targets, then vs now), `muse-voice-transcribe-1.0` (narration), `muse-image-1.0` (creator step card) | |
| Private checker | Muse Spark Open on a Modal Endpoint | Account run screens never leave our own GPU; cheap high volume step checks |

## The loop (one run)

1. Intake: video in, split into frames and audio (ffmpeg).
2. Extract: Spark watches the video and returns steps (time, action, exact detail, and a visual description of any click target). Transcribe adds spoken only steps. SAM boxes each click target on its frame.
3. Type: Spark classifies the tutorial (code, web, Blender, account) and picks the runner within 10 seconds.
4. Run: for each step, Spark calls runner tools (`exec`, `click`, `type`, `screenshot`, `bpy`), reads the result, and grades it ✅ / ⚠️ / ❌. It reads warnings and screen changes, not only exit codes.
5. Repair: on ⚠️ or ❌, Spark searches today's docs, tries the replacement, and keeps it only if it runs.
6. Gate: any publish, pay, delete or send pauses for the user.
7. Output: fixed guide, then vs now pairs, creator view, and a permanent public page for that video.

## Phases

Each phase is done only when its check passes on the real service.

| # | Phase | Done when | Day |
|---|---|---|---|
| 0 | Spikes: Modal sandbox, Spark video, SAM on UI | Done Nov 1, see `docs/spikes/` | Nov 1 |
| 1 | Core logic as pure functions with tests: step schema, grade from logs (warnings, deprecations, exit codes), SAM output parser, timestamp mapping, gate classifier | Unit tests pass, no network | Nov 1 |
| 2 | Intake and extraction: upload or URL, frames, Transcribe merge, SAM targets | The CRA tutorial returns 7+ steps with boxes, stored in Supabase | Nov 1 |
| 3 | Code runner and agent loop | The CRA tutorial runs end to end: Node 14 step ⚠️, CRA step ⚠️ with the Vite replacement run and passing | Nov 1 to 2 |
| 4 | Site v1 with the live panel, deployed to Vercel | A run streams live on the public URL | Nov 2 |
| 5 | Web runner and then vs now | A website tutorial runs; each visual step shows the old frame with SAM box beside today's screenshot with SAM box | Nov 2 |
| 6 | Blender runner | A beginner Blender tutorial rebuilt by script; render shown beside the video's final frame | Nov 3 |
| 7 | Account runner and approval gate | A "post to X" style tutorial runs in the streamed browser and stops at publish, every time | Nov 3 |
| 8 | Muse Spark Open private checker | Account runs grade steps with Spark Open on Modal; no frames sent to an outside API (logged) | Nov 3 |
| 9 | Creator view and Muse Image step card | "Your video breaks at 3:42" page with the generated card | Nov 3 |
| 10 | Benchmark: 50 tutorials (at least 10 per type) with hand checked answers; same runs with Transcribe and SAM switched off | Results page lists accuracy and every miss | Nov 3 to 4 |
| 11 | Design pass, release readiness audit, fixes | Audit findings fixed and retested live | Nov 4 |
| 12 | README, 3 minute demo video, X post, submission | Submitted on Cerebral Valley before 22:00 Lagos | Nov 4 |

**Delegated to subagents (reviewed before merge):** Phase 1 pure functions and tests, site components from the described layout, benchmark tutorial collection (candidates with licence and date), README draft.
**Kept for me:** the agent loop, all Meta API work, runners, security of the account runner, design direction, the benchmark verdicts, the audit.

## Risks and unknowns

| Risk | Status |
|---|---|
| Spark accepts video and extracts exact steps | **Known, passed** (spike) |
| SAM boxes UI elements | **Known, passed** with descriptive phrases; bare nouns fail |
| Modal sandbox runs tutorial commands | **Known, passed** |
| Spark tool calling drives a full multi step run reliably | Needs a spike (Phase 3, first hour) |
| YouTube download from Modal (data centre IPs are often blocked) | Needs a spike; upload is the guaranteed path |
| Max video length per Spark call | Needs a spike with a 20+ minute tutorial; fallback is chunking by time |
| Muse Spark Open available on Modal Endpoints, and its cost | Needs a spike (Phase 8) |
| Streamed cloud browser for the account runner | Needs a spike (Phase 7) |
| Blender headless rebuild quality | Needs a spike (Phase 6) |
| Meta API cost per run (one 4.5 minute video was 73K input tokens) | Measure from the usage page after Phase 3; $150 credit plus card |
| Modal compute beyond the free $1 | Needs the card on Modal ($30/month free); fallback is GitHub Actions runners |
| Rights to tutorials in the demo and preloaded examples | Use Creative Commons licensed videos; results pages link to YouTube, never rehost |
