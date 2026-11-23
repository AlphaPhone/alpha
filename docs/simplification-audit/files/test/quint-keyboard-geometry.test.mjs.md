# test/quint-keyboard-geometry.test.mjs
- Lines: 45 | Kind: Quint replay on a real import (`runtime/canvas-geometry.ts`) | Verdict: MOVE to `specs/quint/refinement/application/keyboard-geometry.mjs` and register in the runner
- Covers: the keyboard-free-height estimator and canvas decision (`canvasGeometry`, `WIDE_CANVAS`) follow 80 KeyboardGeometry traces across focus, keyboard, rotate and remount. Duplicates: `quint-keyboard-detectors` (same estimator), the large-text case of `quint-conformance`. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8 | — | Real import; no port needed. | Keep. | None |
| 2 | — | T4 | Overlaps KeyboardDetectors. | Formal owner may merge the two models. | Low |

## Proposed end state
Driver in the application index; this file deleted.
