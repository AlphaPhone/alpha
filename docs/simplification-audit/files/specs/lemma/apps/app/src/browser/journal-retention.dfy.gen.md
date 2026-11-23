# specs/lemma/apps/app/src/browser/journal-retention.dfy.gen
- Lines: 53 | Kind: LemmaScript generated Dafny (lsc 0.6.6 output, committed for drift check) | Verdict: KEEP
- Covers: a journal pass keeps at most 200 definite rows, none older than 30 days, and settled-deletion trimming keeps at most 127 and never trims queued/paused deletions (Dafny: 16 obligations, run of 2026-11-10). Duplicates: none (companion `.dfy` extends this file); example-based host tests: none by function name. Callers/importers: listed in `LemmaScript-files.txt` (`apps/app/src/browser/journal-retention.ts`), read by `scripts/check-lemma.ts` (`lsc gen-check`, `lsc check`); proved functions `journalRowRetires`, `deletionSettled`, `settledDeletionsToTrim` (hand-written lemmas live only in the `.dfy`) are called from `journal-retention.ts:17,52,53`; module imported by `browser/daily.ts:15` and `browser/calendar-deletions.ts:4` (live; neither is in the D4 deleted set).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | — | Live model: source `apps/app/src/browser/journal-retention.ts` exists and is reachable; nothing in DECISIONS D1–D21 deletes it. Tied to code by `lsc gen-check --backend=dafny` inside `scripts/check-lemma.ts` (run by `npm run lemma:check`, `npm run verify`, `browser.yml` verify job and the broken duplicate `lemma-check.yml`): the companion must equal a fresh generation from the real TypeScript function, so it is compiler output, not a text slice (not T10). | KEEP. | — |
| 2 | 1-2 | — | Generated header; never hand-edit. Any change to an annotated function or its `//@` lines needs `npm run lemma:regen` and committing both companions. | None. | low |

## Proposed end state
- Unchanged file; stays green in `npm run lemma:check` with `LEMMA_REQUIRE_BACKEND=1` and Dafny 4.11.0 on `PATH`.
- Runs in one static/formal CI lane, path-filtered on `apps/app/src/browser/journal-retention.ts`, `specs/lemma/**`, `LemmaScript-files.txt`, `lemmascript.json`, `scripts/check-lemma.ts`, `package-lock.json` (delete `lemma-check.yml`, see ci-and-formal §2.5).
- Any Stage F move/split of the source moves this file to the mirrored path in the same commit, followed by `lemma:regen`.
- Example-based host tests of the same pure function are deleted (T3/T4); the proof is the coverage for the decision, and the surrounding effectful wrapper needs an integration/journey test instead.
