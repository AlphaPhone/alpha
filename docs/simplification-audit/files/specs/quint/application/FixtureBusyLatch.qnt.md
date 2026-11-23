# specs/quint/application/FixtureBusyLatch.qnt
- Lines: 101 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP model (with the dev fixture views); PORT harness
- Covers: busy marks of development fixture views (workflow step, settings check, browser-agent step) cleared on leave except while waiting on confirmation (`latchPatch` and three `onLeave` hooks in `apps/app/src/prototype/model.js`). Duplicates: none. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); `test/quint-fixture-busy-latch.test.mjs` (not in the aggregate index) with `shell-core-fixture.mjs` + `shell-model-traces.mjs`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-5 | D6/D19 | Models dev-simulator fixture views; code lives in production `model.js` (`latchPatch` at :125, hooks at :580, :1720, :4349, :4722). | Keep code and model together (D20); when the fixture views move behind `dev/`, move the manifest source with them. | L |
| 2 | manifest symbols | T10 | Manifest pins literal call text (`function latchPatch(st, keys)`, `latchPatch(api && api.st, ["running"])`, `["busy"]`) — any reformat (Prettier, D9) fails. | Replace with a file pin; cross-file-actions §591 already moves `latchPatch` to `prototype/shell-helpers.js`. | H: blocks the formatter commit |
| 3 | test 11-13 | T2 | Test `readFileSync`s model.js and slices `\nfunction latchPatch(` to the next `\n}` and individual lines. | Import `latchPatch` from `shell-helpers.js` (export it) and drive the views through `shellCore`. | M |
| 4 | — | owner | If the owner deletes these fixture views (not in DECISIONS), delete model, manifest row and test together. | Owner question. | L |

## Proposed end state
- Model unchanged.
- `latchPatch` exported from `prototype/shell-helpers.js`; test imports it; no text slicing of `model.js`.
- Manifest row pins `shell-helpers.js` and `model.js` as files, no literal-code symbols.
