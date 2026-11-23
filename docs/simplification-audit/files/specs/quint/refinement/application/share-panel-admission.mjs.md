# specs/quint/refinement/application/share-panel-admission.mjs
- Lines: 126 | Kind: Quint refinement harness, whole-file transplant (`sourceContext`: type-strip + regex import/export removal of `runtime/share-panel.ts` into a VM) with JSDOM | Verdict: PORT
- Covers: `SharePanelAdmission` — the common Share chooser (`apps/app/src/runtime/share-panel.ts`): only the current panel dispatches, duplicate clicks are inert, invalidated selection refuses, hide/back/home/pagehide/device/incoming-call/cancel/close retire without dispatch, abort is silent and failure reports. Duplicates: Share flows in Notes/Files Playwright specs touch the UI, not the retirement races. Callers: `test/quint-share-panel-admission.test.mjs`, `index.mjs` aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 21-25 | T2 | `sourceContext` strips types and imports by regex. `share-panel.ts` has no imports, so a real bundle is trivial. | Use `browser-model-traces.mjs` `installDocument` + `loadBundled('apps/app/src/runtime/share-panel.ts')`, with fake `setInterval` installed on the JSDOM window. | L |
| 2 | 56-57 | C6 | Button lookup by visible label text (`'Copy text'`, `'Close share'`). | Acceptable (it is what a person sees). | L |
| 3 | 9-10 | B5 | Hashes `strip-types.mjs` and `support.mjs` as inputs. | Drop with port. | L |
| 4 | — | T4 | Per-model test plus aggregate. | Keep per-model only. | L |

Product file read as text: `apps/app/src/runtime/share-panel.ts` (via `sourceContext`).

## Proposed end state
Same ten schedules on the bundled real module in JSDOM; no type stripping; one test entry.
