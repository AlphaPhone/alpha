# specs/quint/refinement/services/credentials.mjs
- Lines: 14 | Kind: Quint refinement harness (compiles and runs real `AlphaCredentialStore`, `LocalAgentProviderAdmission`, `CloudDeployment`, `GoogleWorkspaceReturn` + upstream `NativeProviderAdmission` on a host JVM via `ServiceCredentialTraces.java`) | Verdict: KEEP; add a per-model test wrapper
- Covers: native credential mutation classification, provider recheck, admission stripping and byte-cap preflight against `NativeCredentialMutation.qnt` (23 named scenarios). Duplicates: none. Callers: only `services/index.mjs` (aggregate `runServicesRefinement`); there is **no** `test/quint-native-credential-mutation*.test.mjs` (grep), only `test/quint-refinement-campaigns.test.mjs` uses the name `credentialRefinement` as a string in a fake campaign.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | T4 / P1 | The model is checked only through the 40-minute services aggregate. If the aggregate tests are deleted (research ci-and-formal §2.4), this model loses its only executor. | Add `test/quint-native-credential-mutation.test.mjs` calling `credentialRefinement()` before the aggregate goes. | Medium (coverage loss otherwise) |
| 2 | 7 | B5 | `sources` list + `captureInputs` hashing are provenance ceremony; javac already fails on drift. | Keep while `checkTraces` requires them; drop with the receipt cleanup. | Low |
| 3 | 11 | — | Real product Java classes compiled and executed: import-based, not text-sliced. | Keep. | — |

## Proposed end state
Unchanged harness, run by its own per-model test. Manifest `sources` already list the product classes (all exist; `AlphaCredentialStore.java` is production-reachable).
