# specs/quint/native/NativeNavigationOwnership.qnt
- Lines: 162 | Kind: Quint model, live (listed in `specs/quint/native/manifest.json`, read by `scripts/check-quint.ts` and `scripts/check-quint-refinement.ts`); harness compiles the whole real `AlphaMapsTransportPlugin` and `AlphaNavigationService` against stub Android/Capacitor ports | Verdict: KEEP
- Covers: Maps navigation lease: bridge start/update/stop authority, superseded starts, renderer destroy, notification stop with saved/stale authority, foreground refusal, task-removed root matching (9 runs, 6 invariants). Duplicates: none (Maps journeys in Playwright cannot reach the Android service). Callers/importers: manifest; `specs/quint/refinement/native/navigation-service.mjs` (+`navigation-service-platform.mjs`, `NavigationServiceTraces.java`, `NavigationServicePorts.java`); `test/quint-native-navigation-ownership.test.mjs` (32 lines); also re-run by the family aggregate `specs/quint/refinement/native/index.mjs` (`test/quint-native-refinement.test.mjs`); `native/README.md`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | harness | T10 (none) | No product text is sliced: `navigation-service-platform.mjs` has no `indexOf`/`slice` on product files; the product classes are compiled whole. This is the target shape. | None. | — |
| 2 | test + `index.mjs` | T4 | Runs twice (per-model wrapper and aggregate). | Keep one runner. | None |
| 3 | harness | B5 | `checkTraces` re-hashes every input before and after the run (`driverHashes`, `inputsUnchanged`) and the wrapper test asserts exact trace counts. | Pass/fail only. | None |
| 4 | — | P1 | Should run only on changes to the two Java sources, the harness or the model. | Path filter. | None |

## Proposed end state
Model and harness stay as they are; one runner; path-filtered to `AlphaMapsTransportPlugin.java`, `AlphaNavigationService.java` and the harness files.
