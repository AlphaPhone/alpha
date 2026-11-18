# specs/lemma/apps/app/src/prototype/context-selection.dfy.gen
- Lines: 65 | Kind: LemmaScript generated Dafny (lsc 0.6.6 output, committed for drift check) | Verdict: KEEP
- Covers: a reviewed notice is current only when its identity occurs exactly once at the reviewed revision; a camera capture selection is unchanged only for the same revision (Dafny: 17 obligations, run of 2026-11-10). Duplicates: none (companion `.dfy` extends this file); example-based host tests: `test/context-selection.test.mjs` (overlaps). Callers/importers: listed in `LemmaScript-files.txt` (`apps/app/src/prototype/context-selection.ts`), read by `scripts/check-lemma.ts` (`lsc gen-check`, `lsc check`); proved functions `noticeCurrent`, `captureUnchanged` (hand-written lemmas live only in the `.dfy`) are called from `noticeCurrent` in `prototype/notifications-adapter.ts:7`; `captureUnchanged` in `prototype/camera-adapter.ts:1202,1646`; module installed by `main.tsx:49` (live).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | all | — | Live model: source `apps/app/src/prototype/context-selection.ts` exists and is reachable; nothing in DECISIONS D1–D21 deletes it. Tied to code by `lsc gen-check --backend=dafny` inside `scripts/check-lemma.ts` (run by `npm run lemma:check`, `npm run verify`, `browser.yml` verify job and the broken duplicate `lemma-check.yml`): the companion must equal a fresh generation from the real TypeScript function, so it is compiler output, not a text slice (not T10). | KEEP. | — |
| 2 | 1-2 | — | Generated header; never hand-edit. Any change to an annotated function or its `//@` lines needs `npm run lemma:regen` and committing both companions. | None. | low |
| 3 | — | — | `//@ skip` on four module-level RegExp constants (`OPAQUE`, `SETTINGS_SECTION`, `SENSITIVE_SETTINGS`, `MIME_TYPE`); documented trust boundary. | If Stage F splits the file, put the two proved functions in a module without the regexes and the skips disappear. | low |
| 4 | — | T4 | `test/context-selection.test.mjs` pure cases for `noticeCurrent`/`captureUnchanged` duplicate the proof. | Drop those cases when that test is reviewed. | low |

## Proposed end state
- Unchanged file; stays green in `npm run lemma:check` with `LEMMA_REQUIRE_BACKEND=1` and Dafny 4.11.0 on `PATH`.
- Runs in one static/formal CI lane, path-filtered on `apps/app/src/prototype/context-selection.ts`, `specs/lemma/**`, `LemmaScript-files.txt`, `lemmascript.json`, `scripts/check-lemma.ts`, `package-lock.json` (delete `lemma-check.yml`, see ci-and-formal §2.5).
- Any Stage F move/split of the source moves this file to the mirrored path in the same commit, followed by `lemma:regen`.
- Example-based host tests of the same pure function are deleted (T3/T4); the proof is the coverage for the decision, and the surrounding effectful wrapper needs an integration/journey test instead.
