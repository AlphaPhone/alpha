# apps/app/src/runtime/canvas-geometry.ts
- Lines: 132 | Role: fits the phone canvas to the window (wide/landscape decision and scale, proved in LemmaScript/Dafny) and publishes the responsive surface layout | Verdict: KEEP (minor tidy)
- Importers: main.tsx (`canvasGeometry`, `isEditing`, `keyboardFreeHeight`, `publishSurfaceLayout`, `surfaceLayout`), prototype/calendar-days.ts and prototype/subview-accessibility.ts (`currentSurfaceLayout`), prototype/chat-overlay-motion-adapter.ts (`isEditing`, `keyboardFreeHeight`). Text/path pins: `LemmaScript-files.txt`; `specs/lemma/apps/app/src/runtime/canvas-geometry.dfy` and `.dfy.gen` (generated from the `//@` annotations at L50-51, 59-68, 84-88 — any edit to `canvasScale`/`canvasTop` must regenerate and re-prove); `specs/lemma/README.md`; application manifest symbol pins `canvasGeometry`, `keyboardFreeHeight`, `WIDE_CANVAS`, `isEditing`; quint `calendar-adapter-fixture.mjs`, `portable.mjs`; `test/canvas-geometry.test.mjs`, `test/home-inset-layout.test.mjs`, `test/quint-conformance.test.mjs`, `test/quint-keyboard-detectors.test.mjs`, `test/quint-keyboard-geometry.test.mjs`; CSS comments in prototype/phone.css:604,640,655; feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 72, 75-77 | keep | `unscaled = REFERENCE_WIDTH / REFERENCE_WIDTH` and comparisons instead of `Math.min/max` exist for the prover (comment says so). | Keep. | — |
| 2 | 46, 105 | D4 | `export { keyboardFreeHeight }` re-export and `isEditing = raisesSoftKeyboard` alias of upstream. | Keep: both names are manifest-pinned against this path; revisit when T10 manifests pin files not symbols. | — |
| 3 | 3 | A8 | "issue #411" in the header. | Drop the issue number. | None. |
| 4 | 116, 108 | A7 | `LARGE_TEXT`, `SPLIT_CANVAS` exported; only used in-file (phone.css mentions them in comments). | Unexport. | None. |
| 5 | 124-132 | D3 | Module-level mutable `published` layout read by prototype modules via `currentSurfaceLayout()` — a global integration point. | Acceptable as the single owner; keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `REFERENCE_WIDTH/HEIGHT` (412×915) | const | 37 | 412px/915px literals in phone.css and main.tsx | keep; CSS custom property if duplicated |
| `CanvasInput`, `CanvasScale`, `CanvasGeometry` | type | 18-35, 48 | Dafny `declare-type` mirrors (L50-51) | keep |

## Proposed end state
~128 lines; unchanged logic and proof annotations; two unexported constants and a shorter header.

## Verification
`test/canvas-geometry.test.mjs`, `test/quint-keyboard-geometry.test.mjs`, LemmaScript/Dafny proof regeneration (`specs/lemma`), Playwright responsive-surfaces spec.
