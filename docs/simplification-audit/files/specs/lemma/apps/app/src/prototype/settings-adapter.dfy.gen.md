# specs/lemma/apps/app/src/prototype/settings-adapter.dfy.gen
- Lines: 77 | Kind: LemmaScript generated Dafny (lsc 0.6.6 output, committed for drift check) | Verdict: KEEP
- Covers: 15-minute update-check cadence, update only when all 14 idle facts hold, developer pages/rows hidden without developer surfaces (Dafny: 12 obligations, run of 2026-11-10). Duplicates: none (companion `.dfy` extends this file); example-based host tests: `test/settings-truth.test.mjs`; Quint harnesses `update-staging.mjs`, `settings-handoff*.mjs`. Callers/importers: listed in `LemmaScript-files.txt` (`apps/app/src/prototype/settings-adapter.ts`), read by `scripts/check-lemma.ts` (`lsc gen-check`, `lsc check`); proved functions `updateCheckDue`, `updateIdle`, `settingsPage`, `settingsNavigationRows` (hand-written lemmas live only in the `.dfy`) are called from `settings-adapter.ts:222,289,737,812`; update check is live (`checkForUpdate` at 288, called at 377/635/668/909); `updateCheckDue` also bound by Quint harness `specs/quint/refinement/native/update-staging.mjs:63`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | — | Live model: source `apps/app/src/prototype/settings-adapter.ts` exists and is reachable; nothing in DECISIONS D1–D21 deletes it. Tied to code by `lsc gen-check --backend=dafny` inside `scripts/check-lemma.ts` (run by `npm run lemma:check`, `npm run verify`, `browser.yml` verify job and the broken duplicate `lemma-check.yml`): the companion must equal a fresh generation from the real TypeScript function, so it is compiler output, not a text slice (not T10). | KEEP. | — |
| 2 | 1-2 | — | Generated header; never hand-edit. Any change to an annotated function or its `//@` lines needs `npm run lemma:regen` and committing both companions. | None. | low |
| 3 | — | — | Source is modified in this worktree (1,281 → 1,274 lines) but no annotated function or `//@` line changed (checked `git diff`), so the companion stays valid. Stage C/F edits near lines 185-230 must re-run `lemma:check`. | None now. | med |
| 4 | — | D1 | Proved functions live in a 1,274-line god module. | In Stage F, move the four pure functions (+ `UPDATE_CHECK_INTERVAL_MS`, `UpdateIdleFacts`, `NavigationRow`) to `prototype/settings/policy.ts`; move companions and inventory line; `lemma:regen`; the `__APP_VERSION__` skip then disappears. | med |

## Proposed end state
- Unchanged file; stays green in `npm run lemma:check` with `LEMMA_REQUIRE_BACKEND=1` and Dafny 4.11.0 on `PATH`.
- Runs in one static/formal CI lane, path-filtered on `apps/app/src/prototype/settings-adapter.ts`, `specs/lemma/**`, `LemmaScript-files.txt`, `lemmascript.json`, `scripts/check-lemma.ts`, `package-lock.json` (delete `lemma-check.yml`, see ci-and-formal §2.5).
- Any Stage F move/split of the source moves this file to the mirrored path in the same commit, followed by `lemma:regen`.
- Example-based host tests of the same pure function are deleted (T3/T4); the proof is the coverage for the decision, and the surrounding effectful wrapper needs an integration/journey test instead.
