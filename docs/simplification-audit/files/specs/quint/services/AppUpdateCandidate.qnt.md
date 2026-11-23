# specs/quint/services/AppUpdateCandidate.qnt
- Lines: 125 | Kind: Quint model, live (6 tests, 5 invariants); models release tooling | Verdict: KEEP, SIMPLIFY manifest sources
- Covers: unsigned main-push app-update candidate admission (`scripts/app-update-candidate.ts`). It uses two GitHub run numbers, reruns and three release-floor classes, and checks four things: the first read admits only an advancing code, the final read plus the attempt own the receipt, a receipt is unsigned evidence only, and a refusal preserves earlier evidence. Sources: `scripts/app-update-candidate.ts`, `deliver-app-update.ts`, `update-artifact.ts`, **`.github/workflows/resident-android.yml`**. Duplicates: `test/app-update-candidate.test.mjs` (host test of the same script; research §2.12 lists it among workflow-text tests). Callers: harness `refinement/services/app-update-candidate.mjs` (151 lines, which imports `main` and `test/fixtures/app-update-candidate.mjs`), also imported by `protected-app-update-promotion.mjs`; wrapper `test/quint-app-update-candidate.test.mjs`; aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | manifest | §2.3 / P1 | A workflow YAML is a model source, so every `resident-android.yml` edit (the CI cleanup will make many) selects this model for symbolic checking. The model does not read any YAML property. | Drop `.github/workflows/resident-android.yml` from `sources`. The harness drives `main()`, not the workflow. | low |
| 2 | 46-47 | — | Comment states `finalAdmissionValid` is an input, not model-produced. That is good modelling hygiene. | — | none |
| 3 | whole | owner | Research §10 Q8: `publish-qualified-app-update.yml` asserts `runtimeProfile=='cloud'` while resident-android writes `'native'`. The model abstracts this away. | Owner question only. | owner |
| 4 | — | T4 | `test/app-update-candidate.test.mjs` and this refinement both exercise `scripts/app-update-candidate.ts`. | Keep the refinement. Cut the host test down to cases the model does not cover (archive-size record, CLI argument errors), or delete it. | low |

## Proposed end state
Model unchanged; `sources` = the three scripts. One test path for the candidate script.
