# test/quint-keyboard-detectors.test.mjs
- Lines: 68 | Kind: Quint replay with source transplant (slices `prototype/chat-overlay-motion-adapter.ts` from `const free = keyboardFreeHeight();` to `window.visualViewport?.addEventListener("resize", this.dockKeyboardWatch);`, strips types, wraps it in a `vm.Script`) + real import of `runtime/canvas-geometry.ts` | Verdict: PORT and MOVE (to `specs/quint/refinement/application/keyboard-detectors.mjs`, registered)
- Covers: the chat dock keyboard watch and the canvas keyboard estimator agree with KeyboardDetectors through focus, raise/lower, rotate and resize (150 traces). Duplicates: `quint-keyboard-geometry.test.mjs` replays the same estimator (`keyboardFreeHeight`, `canvasGeometry`) under KeyboardGeometry. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 13-17 | T2, T10 | Two literal markers delimit the slice; the adapter carries LemmaScript contracts and is in the Prettier scope. | PORT: export `createDockKeyboardWatch({window, document, isEditing, keyboardFreeHeight})` from the adapter (or its split) and import it. | High |
| 2 | 29-33 | C1 | Hand-written `window`/`document` stand-ins. | Pass them as the watch's ports. | Low |
| 3 | — | T4 | KeyboardDetectors contains the estimator behaviour of KeyboardGeometry. | Formal owner: consider folding KeyboardGeometry into KeyboardDetectors. | Low |

## Proposed end state
Driver imports the exported dock watch and the estimator, registered in the application index; no slice.
