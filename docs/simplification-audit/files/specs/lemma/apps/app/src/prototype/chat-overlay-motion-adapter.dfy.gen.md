# specs/lemma/apps/app/src/prototype/chat-overlay-motion-adapter.dfy.gen
- Lines: 147 | Kind: LemmaScript generated Dafny (lsc 0.6.6 output, committed for drift check) | Verdict: KEEP
- Covers: chat sheet drag release: flick detection, height clamp, snap to hidden/sheet/full (Dafny: 9 obligations, run of 2026-11-10). Duplicates: `specs/lemma/apps/app/src/prototype/chat-overlay-motion-adapter.dfy` (identical bytes, tool-required); example-based host tests: `test/chat-release.test.mjs`, `test/quint-chat-dock.test.mjs`; Quint `specs/quint/application/manifest.json:7843` pins `chatRelease`. Callers/importers: listed in `LemmaScript-files.txt` (`apps/app/src/prototype/chat-overlay-motion-adapter.ts`), read by `scripts/check-lemma.ts` (`lsc gen-check`, `lsc check`); proved functions `flickSpan`, `clampSheetHeight`, `chatRelease` (hand-written lemmas live only in the `.dfy`) are called from `chat-overlay-motion-adapter.ts:117,124,582`; adapter installed by `main.tsx:15` (live).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | — | Live model: source `apps/app/src/prototype/chat-overlay-motion-adapter.ts` exists and is reachable; nothing in DECISIONS D1–D21 deletes it. Tied to code by `lsc gen-check --backend=dafny` inside `scripts/check-lemma.ts` (run by `npm run lemma:check`, `npm run verify`, `browser.yml` verify job and the broken duplicate `lemma-check.yml`): the companion must equal a fresh generation from the real TypeScript function, so it is compiler output, not a text slice (not T10). | KEEP. | — |
| 2 | all | C5 (tool-imposed) | `.dfy` and `.dfy.gen` are byte-identical (`cmp`). lsc needs both: `.dfy.gen` is the regeneration/merge base, `.dfy` is what Dafny verifies (`lsc.js:370-372`). | None; deleting either breaks `gen-check`. | — |
| 3 | 1-2 | — | Generated header; never hand-edit. Any change to an annotated function or its `//@` lines needs `npm run lemma:regen` and committing both companions. | None. | low |
| 4 | — | D1 | The proved pure functions sit in a 973-line adapter. Generated module includes every annotated declaration in the file, so a Stage F split changes the companion path. | In Stage F, extract the three functions and their constants into `prototype/chat-overlay-motion.ts` (pure), move companions to `specs/lemma/apps/app/src/prototype/chat-overlay-motion.dfy(.gen)`, update `LemmaScript-files.txt`, run `npm run lemma:regen`. | med |
| 5 | — | T4 | `test/chat-release.test.mjs` re-checks `chatRelease` outcomes by example. | Delete pure-decision cases when that test is reviewed; the proof plus the Quint replay cover it. | low |

## Proposed end state
- Unchanged file; stays green in `npm run lemma:check` with `LEMMA_REQUIRE_BACKEND=1` and Dafny 4.11.0 on `PATH`.
- Runs in one static/formal CI lane, path-filtered on `apps/app/src/prototype/chat-overlay-motion-adapter.ts`, `specs/lemma/**`, `LemmaScript-files.txt`, `lemmascript.json`, `scripts/check-lemma.ts`, `package-lock.json` (delete `lemma-check.yml`, see ci-and-formal §2.5).
- Any Stage F move/split of the source moves this file to the mirrored path in the same commit, followed by `lemma:regen`.
- Example-based host tests of the same pure function are deleted (T3/T4); the proof is the coverage for the decision, and the surrounding effectful wrapper needs an integration/journey test instead.
