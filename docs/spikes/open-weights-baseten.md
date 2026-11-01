# Spike: Muse Spark Open for the private checker (Nov 1 2026)

**Question:** Can we run a Meta open weights model with vision, without Modal (card declined by Stripe)?

**Run:** Baseten Model APIs (`https://inference.baseten.co/v1`, OpenAI compatible, `Authorization: Api-Key`). `/v1/models` lists `meta-models/muse-spark-open`. Sent the nodejs.org frame (01:37 of the CRA tutorial) with "The step was: click the 14.17.5 LTS download button. Is that button visible?"

**Output:** 3.6 seconds, 486 prompt tokens. Reasoning: "Two green buttons: 14.17.5 LTS and 16.7.0 Current ... it's visible." Hit `max_tokens=300` while reasoning, so the real call needs a larger budget and a JSON only instruction.

**Verdict:** PASS. Muse Spark Open reads screenshots and grades a step. Free tier: $1 of Model API credit, no card. Enough for demo account runs; not for the 50 tutorial benchmark.

**Compute change:** Modal rejected the card. Runs move to GitHub Actions (one workflow job per tutorial run, free for public repos): code steps in a Docker container on the runner, Playwright for web, Blender headless installed on the runner.
