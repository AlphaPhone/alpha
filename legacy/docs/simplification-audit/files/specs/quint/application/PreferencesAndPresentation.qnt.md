# specs/quint/application/PreferencesAndPresentation.qnt
- Lines: 48 | Kind: Quint model (live; import-based harness) | Verdict: KEEP
- Covers: Layout results: calendar days 1..7, large text forces agenda and single pane, keyboard is not rotation, theme read back after restart; canaries prove predicates reject broken results. Duplicates: specs/quint/application/PreferencesAndPresentationAuditState.qnt (same layout arithmetic, unharnessed twin). Callers/importers: manifest row (7 renderer sources + 2 shared); harness specs/quint/refinement/application/portable.mjs `preferences` (sourceModule = esbuild bundle of runtime/canvas-geometry.ts); test/quint-conformance.test.mjs:111 (largeTextTest end state again); specs/quint/ui-return-review-20261109.md

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | - | Imports real `surfaceLayout`, `keyboardFreeHeight`, `canvasGeometry`. | Keep. | L |
| 2 | manifest sources | B5 | Lists home-cards.ts, home-shell.ts, settings-adapter.ts, display.ts, system-shade.ts and SystemShade.java though only canvas-geometry.ts is executed; theme readback is not observed by the harness. | Sources = canvas-geometry.ts (+ text-scale.ts if used). | L |
| 3 | conformance | T4 | test/quint-conformance.test.mjs repeats one trace end state. | Drop that case. | L |
| 4 | 36-46 | B5 | Canary actions excluded from step: acceptable self-check of the predicates; cheap. | Keep. | L |

## Proposed end state
Unchanged model; manifest sources reduced to the executed module; one harness.
