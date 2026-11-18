# specs/quint/application/KeyboardDetectors.qnt
- Lines: 117 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP; absorb KeyboardFocus; PORT test
- Covers: the canvas estimator and the chat dock's keyboard watch agree, the dock calls the composer covered only under the full keyboard, and a release follows a seen cover (`chat-overlay-motion-adapter.ts`, `runtime/canvas-geometry.ts`, `main.tsx`). Duplicates: canvas estimator part duplicates KeyboardGeometry's `measuredState`; dock watch region is also sliced by KeyboardFocus. Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); `test/quint-keyboard-detectors.test.mjs` (not in the aggregate)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | test 13-16 | T2 | Slices chat-overlay-motion-adapter.ts between `const free = keyboardFreeHeight();` and `window.visualViewport?.addEventListener("resize", this.dockKeyboardWatch);`. | Extract the dock keyboard watch into an exported function (e.g. `createDockKeyboardWatch` beside `canvas-geometry.ts`) and import it. | M |
| 2 | 1-117 | C5 | KeyboardFocus models native IME visibility/handoff over the same dock watch. | Merge KeyboardFocus's `native` visibility + handoff into this model (see its report) so one model and one harness cover the dock. | M: must keep all KeyboardFocus runs passing |
| 3 | manifest symbols | T10 | Pins `dockKeyboardWatch`, `keyboardOpen`, `releaseComposer` (adapter instance fields). | Pin files. | L |

## Proposed end state
- One keyboard-dock model (this file + KeyboardFocus actions), one test importing an exported dock watch.
- KeyboardGeometry stays separate (pure estimator, already import-based).
