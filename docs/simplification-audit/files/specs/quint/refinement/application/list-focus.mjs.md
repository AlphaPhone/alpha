# specs/quint/refinement/application/list-focus.mjs
- Lines: 123 | Kind: Quint refinement harness (whole-file transplant, `ListFocus`, live) | Verdict: PORT
- Covers: keyed list focus restore across re-renders — restores only the captured logical row, only for the latest commit, never over other focus, refuses hidden/disabled/dialog/hidden-document/disconnected targets (`createKeyedListFocus` in `apps/app/src/prototype/keyed-list-focus.ts`). Duplicates: Notes/Photos Playwright specs exercise focus restore only incidentally. Callers/importers: `test/quint-list-focus-refinement.test.mjs` (note: not named `quint-list-focus`), aggregate `index.mjs` (T4).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 69-72 | T2/T10 | Strips the whole file, regex-removes `export`, then inserts `inspect: () => ({root, revision})` at the literal `'return {\n    capture()'` (newline + 4 spaces) and evals in `vm`. | Import the module (`sourceModule`), patch `globalThis.queueMicrotask` and `document` per fixture, and observe `root/revision` either by having the manager return `revision` from `capture()` or via an esbuild `onLoad` seam on the imported module (no vm). | M: Prettier-sensitive anchor. |
| 2 | 9-10 | C5 | Own `sources` list (hard-codes the test file path) and own `root`, bypassing `support.mjs` `captureSources/boundInputs`. | Use `support.mjs`. | L |
| 3 | all | D8 | Minified one-space style, multi-statement lines (e.g. 17, 25, 31). | Prettier after the port. | — |
| 4 | test wrapper | B5 | Asserts `observedFields.length === 15`, `traceInputs.length === 24` and a name list. | Drop. | L |

## Proposed end state
Imports `createKeyedListFocus`; 24 schedules kept; shared helpers; no vm/strip-types.
