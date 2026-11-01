// Runs with a wrong verdict found by hand. Runs are never edited; they are labelled instead.
// The full list with causes and fixes is docs/benchmark/MISSES.md.
export const MISSES_URL = "https://github.com/jenzylove/origin/blob/main/docs/benchmark/MISSES.md";

export const KNOWN_MISSES: Record<string, string> = {
  "3eaca03f-0dce-48fb-97d0-66f8fd732187": "Ran in an old Blender, not today's. Fixed; rerun listed above.",
  "a1f4b802-da4d-4648-ae3c-6d5b24d95a7f": "Marked opening VS Code as broken. Fixed: editor steps are now skipped.",
  "aad039b6-4411-4715-add7-2da93c936c57": "Marked opening VS Code as broken. Fixed: editor steps are now skipped.",
  "525eaf27-db1a-49ac-96f8-ed688d789382": "One step marked changed with a reason that says it works.",
  "0bac1a33-e660-4eba-a2ce-057f76f1b87e": "A rule check wrongly overrode one step to broken. Fixed.",
  "8e33cc1d-a1b6-4dc3-8cbd-8dedef4e9d03": "The THEN outline is on the wrong button. Fixed.",
  "0804bd40-d22e-4e79-a5ac-0902a130c164": "One watch step could not be checked. Fixed.",
};
