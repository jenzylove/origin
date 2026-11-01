# Spike: Modal sandbox as the code runner

**Question:** Can a Modal sandbox run a real tutorial command end to end, and what does a "retired" tool actually do today?

**Run (Nov 1 2026):** Debian slim + Node 22 in a Modal Sandbox, then `npx --yes create-react-app demo`.

**Output:**
- Sandbox up and Node 22.23.4 / npm 10.9.9 ready; whole run 38 to 60 seconds.
- `create-react-app is deprecated.` plus seven `npm warn deprecated` lines (inflight, glob 7, rimraf 2, tar 2, ...).
- Then `Success! Created demo at /demo`.

**Verdict:** Modal works as the code runner. The PRD claim "every tutorial that starts with Create React App now fails at step one" is **wrong**: it still succeeds, with deprecation warnings. Origin must grade a step "changed" (runs, but deprecated or not the current way) as well as "broken" (fails), and read warnings, not only exit codes. PRD corrected.
