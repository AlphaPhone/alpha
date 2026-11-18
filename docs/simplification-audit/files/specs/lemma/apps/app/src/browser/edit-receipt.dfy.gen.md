# specs/lemma/apps/app/src/browser/edit-receipt.dfy.gen
- Lines: 33 | Kind: LemmaScript generated Dafny (lsc 0.6.6 output, committed for drift check) | Verdict: KEEP
- Covers: a `prepared` video-edit receipt is abandoned after 24 h and settled statuses are exactly saved/failed/cancelled/unchanged (Dafny: 2 obligations, run of 2026-11-10). Duplicates: `specs/lemma/apps/app/src/browser/edit-receipt.dfy` (identical bytes, tool-required); example-based host tests: `test/browser-camera-storage.test.mjs:105-110` asserts the same cases by example (T4: weaker duplicate of this proof). Callers/importers: listed in `LemmaScript-files.txt` (`apps/app/src/browser/edit-receipt.ts`), read by `scripts/check-lemma.ts` (`lsc gen-check`, `lsc check`); proved functions `editReceiptAbandoned`, `editReceiptSettled` (hand-written lemmas live only in the `.dfy`) are called from `prototype/browser-camera.ts:11,101,159` (video-edit IndexedDB receipts); `browser-camera.ts:12` re-exports both (D4/D7: re-export exists only so `test/browser-camera-storage.test.mjs` can reach them).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | — | Live model: source `apps/app/src/browser/edit-receipt.ts` exists and is reachable; nothing in DECISIONS D1–D21 deletes it. Tied to code by `lsc gen-check --backend=dafny` inside `scripts/check-lemma.ts` (run by `npm run lemma:check`, `npm run verify`, `browser.yml` verify job and the broken duplicate `lemma-check.yml`): the companion must equal a fresh generation from the real TypeScript function, so it is compiler output, not a text slice (not T10). | KEEP. | — |
| 2 | all | C5 (tool-imposed) | `.dfy` and `.dfy.gen` are byte-identical (`cmp`). lsc needs both: `.dfy.gen` is the regeneration/merge base, `.dfy` is what Dafny verifies (`lsc.js:370-372`). | None; deleting either breaks `gen-check`. | — |
| 3 | 1-2 | — | Generated header; never hand-edit. Any change to an annotated function or its `//@` lines needs `npm run lemma:regen` and committing both companions. | None. | low |
| 4 | — | T4 | `test/browser-camera-storage.test.mjs:105-110` re-checks the exact truth table the proof establishes for all inputs. | Delete those assertions when that host test is reviewed; drop the `browser-camera.ts:12` re-export with them. | low |

## Proposed end state
- Unchanged file; stays green in `npm run lemma:check` with `LEMMA_REQUIRE_BACKEND=1` and Dafny 4.11.0 on `PATH`.
- Runs in one static/formal CI lane, path-filtered on `apps/app/src/browser/edit-receipt.ts`, `specs/lemma/**`, `LemmaScript-files.txt`, `lemmascript.json`, `scripts/check-lemma.ts`, `package-lock.json` (delete `lemma-check.yml`, see ci-and-formal §2.5).
- Any Stage F move/split of the source moves this file to the mirrored path in the same commit, followed by `lemma:regen`.
- Example-based host tests of the same pure function are deleted (T3/T4); the proof is the coverage for the decision, and the surrounding effectful wrapper needs an integration/journey test instead.
