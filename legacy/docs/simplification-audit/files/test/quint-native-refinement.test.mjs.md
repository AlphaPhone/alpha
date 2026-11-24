# test/quint-native-refinement.test.mjs
- Lines: 26 | Kind: Quint aggregate runner (`runNativeRefinement` from `specs/quint/refinement/native/index.mjs`) | Verdict: MERGE into `test/quint-refinement.test.mjs`
- Covers: every native model in `specs/quint/native/manifest.json` (minus two compositions, plus `NativeCredentialMutation`) produces a passing receipt; the compositions produce obligations. Duplicates: about 54 per-model native wrappers run the same campaigns (all native wrappers in this chunk); `quint-native-conformance` runs one campaign a third time. Callers/importers: `npm test` glob (`node --test test/*.test.mjs`); nothing imports it.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-8 | P1, T4 | 2400 s budget ("exceeded 20 minutes"); every native campaign runs here and again in its wrapper. | One runner registers one `test()` per manifest model, so failures name the model and `--test-name-pattern`/`quint:changed` can select models. | Medium |
| 2 | 14-17 | — | Manifest completeness (every native model has a receipt) is the useful invariant. | Carry into the runner for all families. | None |
| 3 | 18-22 | B5 | Re-asserts `checkpoints > 0`, `driverInputsBound`, `passed` for each receipt. | Keep only `passed`. | None |
| 4 | 15-16 | T1 | Hard-codes the exclusion list `ApplicationComposition`, `ControllerComposition` and the extra model name. | Read compositions from the manifest (a `composition: true` flag). | Low |

## Proposed end state
Deleted; `test/quint-refinement.test.mjs` reads the four manifests, registers one test per model (native included) and checks completeness. Per-model wrappers in this family are deleted.
