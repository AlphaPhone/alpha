# specs/lemma/apps/app/src/browser/browser-poll.dfy
- Lines: 36 | Kind: LemmaScript proof companion, byte-identical to .dfy.gen | Verdict: KEEP
- Covers: browser-surface poll idles off the browser view and retry back-off stays in [2 s, 60 s] and is monotone (Dafny: 3 obligations, run of 2026-11-10). Duplicates: `specs/lemma/apps/app/src/browser/browser-poll.dfy.gen` (identical bytes, tool-required); example-based host tests: none found in `test/` or `specs/quint` by function name. Callers/importers: listed in `LemmaScript-files.txt` (`apps/app/src/browser/browser-poll.ts`), read by `scripts/check-lemma.ts` (`lsc gen-check`, `lsc check`); proved functions `surfaceIdleForView`, `retryDelayForCount` are called from `surfacePollIdle` / retry scheduling in `browser-poll.ts:6,18`, imported by `prototype/browser-adapter.ts:18`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | — | Live model: source `apps/app/src/browser/browser-poll.ts` exists and is reachable; nothing in DECISIONS D1–D21 deletes it. Tied to code by `lsc gen-check --backend=dafny` inside `scripts/check-lemma.ts` (run by `npm run lemma:check`, `npm run verify`, `browser.yml` verify job and the broken duplicate `lemma-check.yml`): the companion must equal a fresh generation from the real TypeScript function, so it is compiler output, not a text slice (not T10). | KEEP. | — |
| 2 | all | C5 (tool-imposed) | `.dfy` and `.dfy.gen` are byte-identical (`cmp`). lsc needs both: `.dfy.gen` is the regeneration/merge base, `.dfy` is what Dafny verifies (`lsc.js:370-372`). | None; deleting either breaks `gen-check`. | — |
| 3 | — | B3 | `browser-poll.ts:18` wraps the proved function in `Math.floor(Number(failures) \|\| 0)`; the integer model only holds for that wrapper, which is outside the proof. | None in this file; product-side note only. | low |

## Proposed end state
- Unchanged file; stays green in `npm run lemma:check` with `LEMMA_REQUIRE_BACKEND=1` and Dafny 4.11.0 on `PATH`.
- Runs in one static/formal CI lane, path-filtered on `apps/app/src/browser/browser-poll.ts`, `specs/lemma/**`, `LemmaScript-files.txt`, `lemmascript.json`, `scripts/check-lemma.ts`, `package-lock.json` (delete `lemma-check.yml`, see ci-and-formal §2.5).
- Any Stage F move/split of the source moves this file to the mirrored path in the same commit, followed by `lemma:regen`.
- Example-based host tests of the same pure function are deleted (T3/T4); the proof is the coverage for the decision, and the surrounding effectful wrapper needs an integration/journey test instead.
