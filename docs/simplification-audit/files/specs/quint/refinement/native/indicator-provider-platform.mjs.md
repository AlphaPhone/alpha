# specs/quint/refinement/native/indicator-provider-platform.mjs
- Lines: 56 | Kind: Quint refinement fixture builder (Android Binder/ContentProvider/caller-identity stubs as strings) | Verdict: KEEP (move stubs to files)
- Covers: ports for `indicator-provider.mjs` (`NativeIndicatorProvider`). Also stubs `ai.eliza.sense.Listener` (convergence target). Callers/importers: `indicator-provider.mjs:5`; mentioned in `README.md`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-53 | D6 / D8 | Minified one-line Java in strings. | `stubs/indicator-provider/*.java`. | Low |
| 2 | 54 | C3 | Temp write loop duplicated. | Shared helper. | None |
| 3 | 47-52 | — | `Listener` stub must keep the static signatures the real `IndicatorLeaseProvider` calls (`leaseBoot`, `observeIndicatorLease`, `refresh`). | Keep. | Low |

## Proposed end state
Static stub files; this module removed or reduced to a path constant.
