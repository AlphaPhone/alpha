# specs/quint/application/KeyboardGeometry.qnt
- Lines: 111 | Kind: Quint model (live, `specs/quint/application/manifest.json`) | Verdict: KEEP (already import-based)
- Covers: keyboard-free height estimator with memory and the canvas arrangement (keyboard never read as rotation, wide canvas only landscape on tall phones) (`canvasGeometry`, `keyboardFreeHeight`, `WIDE_CANVAS` in `apps/app/src/runtime/canvas-geometry.ts`). Duplicates: KeyboardDetectors repeats the estimator; acceptable (it models agreement between two users of it). Callers/importers: `scripts/check-quint.ts` (scenarios + simulation, manifest family `application`); `test/quint-keyboard-geometry.test.mjs` (imports the module; not in the aggregate)

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | test 8 | — | Imports the real module: target pattern. | None. | none |
| 2 | manifest | — | `sharedSources` upstream `responsive-layout.ts`; `main.tsx` listed though only canvas-geometry is driven. | Drop `main.tsx` from sources or keep as change trigger only. | L |

## Proposed end state
- Unchanged.
