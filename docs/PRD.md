# Origin: Product Requirements

**Hackathon:** Meta Global AI Developer Hackathon (Meta + Cerebral Valley)
**Track:** Indie Developer · **Theme:** Push the Frontier (software)
**Build window:** Oct 26 to Nov 4, 2026 · **Submission deadline:** Nov 4, 2026, 9:00 PM ET (Nov 5, 02:00 UTC)
**Status:** Accepted into the hackathon. Corrected against the published rules on Nov 1, 2026. All code is written in the event window.

---

## 1. One line

Paste any tutorial video. Origin runs it, step by step, on today's software, shows you where it breaks, and gives you a version that works now.

## 2. The problem

People learn software from video, and software changes every few months. A tutorial recorded last year often breaks partway through: a command was renamed, a package was retired, a menu moved, a setting disappeared. The learner finds out at step 4, with no way to tell which step is wrong or what replaced it.

Evidence:

- **Even well-maintained docs drift.** A 2026 ACM TOSEM study (DOSUD) found outdated screenshots in the official VS Code docs and on 50 Android app sites. The VS Code team confirmed and fixed every one.
- **Popular starting points get retired, and still look like they work.** Create React App was the default first command in thousands of React tutorials. The React team deprecated it in February 2025. Run today (Origin spike, Nov 1 2026), it prints "create-react-app is deprecated" and seven deprecated package warnings, then reports "Success!". The learner is taught a retired tool and is never told.
- **Existing tools only cover docs a company owns.** Doc Detective tests written docs from hand-written scripts. Trupeer regenerates a company's own guides after it re-records them. Nothing checks the public tutorials people actually learn from.
- **Search and chat can't settle it.** Google finds the video but can't tell you whether it still works. A chatbot answers from old training data and never runs the steps.

To be gathered during the build: a count of "doesn't work anymore" comments on a sample of popular tutorials, cited by video.

## 3. Who it's for

1. **Learners** following a tutorial that stopped working. This is the main user and the demo's front door.
2. **Tutorial creators** who want to know which of their videos broke, at which timestamp, and what to pin as a fix.
3. **Developer relations and docs teams** whose product appears in thousands of third-party tutorials they don't control.

## 4. Front door

The first ten seconds: one box. Paste a tutorial link (YouTube or an uploaded video).

1. Within 10 seconds Origin says what kind of tutorial it is (code, website, Blender, account-based) and what it will run.
2. A live panel opens next to the video: the terminal, browser or Blender render the agent is driving. Every action is real and visible.
3. Each step lights up as it runs: ✅ still works, ⚠️ changed (it runs but is deprecated or no longer the current way, with the new way), ❌ removed (with the closest working replacement). Origin reads warnings and screen changes, not only exit codes.
4. The result is a fixed guide: every step that works today, with fresh screenshots or output, and a link to the exact moment in the video each step came from.
5. **Then vs now:** for every visual step, the old video frame with SAM 3.1 outlining what the narrator clicked, beside today's screen with the matching element outlined, or marked as moved or gone.

Judges can paste a tutorial of their own choosing. Preloaded examples cover each tutorial type for a one-click try.

## 5. How it works

### Meta models do the thinking

| Model | Job |
|---|---|
| **Muse Spark 1.3** | Watches the whole video, writes the step list, and drives the run: decides each action, reads each result, and finds the new path when a step breaks. |
| **Muse Voice Transcribe** | Turns the narration into text, so steps that are only spoken ("now set it to 30") are captured. Meta's docs say Spark 1.3's own audio understanding isn't fully reliable yet, so this model has a real job. |
| **SAM 3.1** | Finds the exact button, menu or object the narrator clicks in each frame and outlines it, so every step has a precise visual target to match against today's screen. |
| **Muse Image** | Draws the before/after step card for creators to pin, with exact text (it runs code before rendering). |

### Outside tools are the hands

Origin needs tools that act; Meta's models decide what they do.

| Tutorial type | Hands | Finished means |
|---|---|---|
| Code and app building | A sealed sandbox with a terminal and editor | Every command and code step runs; the app starts; the page loads or the tests pass |
| Websites and web apps | A real browser (Playwright) | Every click done on today's site, with a fresh screenshot per step |
| Blender and other scriptable creative apps | The app's own scripting engine (Blender's Python API), run headless | The tutorial's scene rebuilt step by step and the final render shown next to the video's final frame |
| Tutorials that post, publish or pay | The user's own logged-in browser session | Every step done, stopping at the final publish or pay button for the user's one click |

## 6. Full scope (one build, nothing deferred)

1. **Intake:** a YouTube link or uploaded video, downloaded and split into frames and audio.
2. **Step extraction:** Spark 1.3 plus the narration transcript plus SAM 3.1 click targets, giving an ordered step list with a timestamp and visual target for each step.
3. **Tutorial typing:** classifies the tutorial and picks the hands within 10 seconds.
4. **Runners:** sandbox (code), browser (web), Blender headless (creative), user session (account-based).
5. **Repair:** when a step fails, Spark 1.3 searches the current docs (web search grounding), tries the replacement, and keeps it only if it runs.
6. **Approval gate:** any step that publishes, pays, deletes or sends is paused for the user.
7. **Live view:** the run streams as it happens, with every action logged.
8. **Fixed guide:** an exportable working version (Markdown and a shareable page).
9. **Creator view:** "your video breaks at 3:42; here is the fix", with the Muse Image step card.
10. **Results page:** the public accuracy record (section 8).

### Cut, and why

Nothing cut yet. If a spike (section 10) fails, the cut is listed here with the reason before any code depends on it.

## 7. How each judging criterion is met

Stage 1 (pass/fail): fits a problem statement (Push the Frontier, software) and uses the Meta Model API. Stage 2, scored 0 to 10:

| Criterion | Weight | How Origin meets it |
|---|---|---|
| Impact | 30% | Every learner who hits "it broke at step 4" gets a working version, and every creator learns which videos broke and where. One run serves every later viewer of that video. |
| Use of Meta AI tooling | 25% | Four Meta models, each with a job the others can't do. Spark 1.3 runs the whole agent loop; SAM 3.1 makes then vs now visible on every step. |
| Technical depth and execution | 20% | Video understanding, speech, segmentation and a live agent across four kinds of runner, in one loop, deployed. |
| Demo | 25% | The judge brings the tutorial. The run is live and visible. The results page shows every miss. |

Stage 3: top 5 per track judged live. Bonus prizes in reach: Best Agentic Use Case, Best Creative Build (Muse Image), Most Viral.

## 8. Claims and how each is proven

| Claim | Proof |
|---|---|
| Origin finds where a tutorial breaks | Results page: 50 real tutorials (at least 10 per type), each verdict checked by hand, accuracy published with every miss listed |
| The fix actually works | Every repaired step is kept only after it runs; the run log shows the passing output |
| Narration and click targets matter | The same 50 runs with Voice Transcribe and SAM switched off; step extraction accuracy compared side by side |
| The run is real | The live view streams the actual terminal, browser or render; runs are stored and replayable, marked live or replay |
| It never acts on your accounts without you | Test cases where a tutorial publishes or pays; the run must stop at the gate every time |

No number appears in the product or the submission unless it is read live or sourced.

## 9. What it does not do

- It doesn't run tutorials for phone apps or physical hardware.
- It doesn't press publish, pay, delete or send for you.
- It doesn't judge whether a tutorial is good teaching, only whether its steps work today.
- It doesn't store your passwords. Account-based runs use your own browser session.

## 10. Unknowns to settle before building on them

| Unknown | Status |
|---|---|
| Can Spark 1.3 drive a browser and a terminal reliably through a full tutorial? Meta's cookbook shows desktop and browser control from screenshots. | Needs a spike: one code tutorial and one web tutorial end to end |
| Can Spark 1.3 take a full 10 to 30 minute tutorial video in one call? Docs give a 1M-token context but no video length limit. | Needs a spike |
| SAM 3.1 on screen recordings: does "button" or "menu" segment cleanly on UI? | Needs a spike |
| Blender headless rebuild from extracted steps | Needs a spike |
| Downloading YouTube videos for processing | Known: use an uploaded file as the fallback path, and check terms during the build |
| API cost per run | Measure in the spikes; the starter credits plus any partner credits set the budget |

## 11. Submission checklist

Ticked only from the live app, never from intent. Becomes `docs/SUBMISSION_CHECKLIST.md`.

- [x] Application submitted and accepted
- [x] Official rules read and this PRD corrected against them (Nov 1)
- [ ] Meta API credit claim form submitted before Nov 4, 9:00 PM ET
- [ ] Uses Meta Model API models (`muse-spark-1.3`, `sam-3.1`, `muse-voice-transcribe-1.0`, Muse Image)
- [ ] Fits Push the Frontier (software); entered in the Indie Developer track
- [ ] New work only: every commit dated inside the event window; the demo says what was built
- [ ] Public repo
- [ ] Deployed live product judges can use
- [ ] 3 minute demo video of what was built
- [ ] Everyone who worked on it listed
- [ ] Not an excluded project type (not a basic chatbot, RAG or simple analyser)
- [ ] Only tutorials we have the right to use in the demo and preloaded examples
- [ ] Most Viral: X post link submitted on the platform
- [ ] Submitted on the Cerebral Valley platform before Nov 4, 9:00 PM ET

## 12. Acceptance tests

1. Paste a code tutorial that uses a retired tool (for example Create React App). Origin flags the failing step, finds the current replacement, runs it, and the app loads in the sandbox.
2. Paste a website tutorial with a moved menu. Origin marks the step ⚠️ and shows today's path with a live screenshot.
3. Paste a Blender tutorial. Origin rebuilds the scene through Blender's scripting and shows the render beside the video's final frame.
4. Paste a tutorial that ends by publishing. Origin completes every step and stops at publish.
5. Paste a tutorial Origin can't run (a phone app). Within 10 seconds it says so and why.
6. The results page loads with all 50 runs and their misses listed.
