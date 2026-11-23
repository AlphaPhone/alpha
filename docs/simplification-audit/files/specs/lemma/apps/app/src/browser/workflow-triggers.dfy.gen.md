# specs/lemma/apps/app/src/browser/workflow-triggers.dfy.gen
- Lines: 51 | Kind: LemmaScript generated Dafny (lsc 0.6.6 output, committed for drift check) | Verdict: KEEP
- Covers: simulated workflow trigger cursor is monotone and catches up one day per pass; scan/dispatch gating is foreground-only and independent (Dafny: 11 obligations, run of 2026-11-10). Duplicates: none (companion `.dfy` extends this file); example-based host tests: `test/workflow-trigger-detection.test.mjs`; Quint `specs/quint/services/manifest.json` pins `triggerTickPlan` (TriggerCursor.qnt, WorkflowWakeups.qnt). Callers/importers: listed in `LemmaScript-files.txt` (`apps/app/src/browser/workflow-triggers.ts`), read by `scripts/check-lemma.ts` (`lsc gen-check`, `lsc check`); proved functions `placeChanged`, `cursorThrough`, `triggerTickPlan` (hand-written lemmas live only in the `.dfy`) are called from `workflow-triggers.ts:64`, `browser/workflow-trigger-runtime.ts:67,87`; the runtime is imported only by `browser/simulated-workflows.ts:5` → `browser/simulated-apps.ts:3` → `main.tsx:38` (development simulator surface).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | — | Live model: source `apps/app/src/browser/workflow-triggers.ts` exists and is reachable; nothing in DECISIONS D1–D21 deletes it. Tied to code by `lsc gen-check --backend=dafny` inside `scripts/check-lemma.ts` (run by `npm run lemma:check`, `npm run verify`, `browser.yml` verify job and the broken duplicate `lemma-check.yml`): the companion must equal a fresh generation from the real TypeScript function, so it is compiler output, not a text slice (not T10). | KEEP. | — |
| 2 | 1-2 | — | Generated header; never hand-edit. Any change to an annotated function or its `//@` lines needs `npm run lemma:regen` and committing both companions. | None. | low |
| 3 | — | D6/D20 | Proves code reachable only through the development simulator. DECISIONS D20 keeps code and proof together while the simulator specs stay. | KEEP now. If Stage F deletes or moves the workflow simulator to `dev/`, move/delete this companion pair and its `LemmaScript-files.txt` line in the same commit (check-lemma rejects unlisted annotations and missing companions). | med |

## Proposed end state
- Unchanged file; stays green in `npm run lemma:check` with `LEMMA_REQUIRE_BACKEND=1` and Dafny 4.11.0 on `PATH`.
- Runs in one static/formal CI lane, path-filtered on `apps/app/src/browser/workflow-triggers.ts`, `specs/lemma/**`, `LemmaScript-files.txt`, `lemmascript.json`, `scripts/check-lemma.ts`, `package-lock.json` (delete `lemma-check.yml`, see ci-and-formal §2.5).
- Any Stage F move/split of the source moves this file to the mirrored path in the same commit, followed by `lemma:regen`.
- Example-based host tests of the same pure function are deleted (T3/T4); the proof is the coverage for the decision, and the surrounding effectful wrapper needs an integration/journey test instead.
