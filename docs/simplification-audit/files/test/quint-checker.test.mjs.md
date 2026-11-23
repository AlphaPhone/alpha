# test/quint-checker.test.mjs
- Lines: 108 | Kind: tooling (pure functions of `scripts/quint-lib.ts` + one integration that copies the runner into a temp repo and spawns `check-quint.ts` twice) | Verdict: KEEP 3 cases → MERGE into `test/tooling/quint.test.mjs`; DELETE 3
- Covers: Quint scenario execution is proven from CLI output, manifest metadata (bounds, invariants, extra inits) is validated, counterexamples are recognised only with pinned markers, and a silent native checker crash gets one retry. Duplicates: none. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-13 | keep | "Every registered scenario actually ran" parser: guards the 100 % Quint promise. | Keep. | Low |
| 2 | 15-28 | keep | Manifest metadata validation and option derivation. | Keep. | Low |
| 3 | 30-35 | P8/B5 | Registry floors `{application:116, services:51, native:65, legacy:27}` and `>=1841` scenarios: magic counts that must be lowered by hand on every intentional retirement (this cleanup deletes several models, e.g. PreviousNotesSourceOpening, CalendarPreservationConfirmation). | Delete. | Low |
| 4 | 37-44 | keep | Counterexample admission against tool errors. | Keep. | Low |
| 5 | 46-66 | B5 | Retry-once policy for a silent SIGSEGV of the checker. Scripts review recommends dropping the custom process supervisor. | Delete with the supervisor; keep only if the supervisor stays. | Low |
| 6 | 68-108 | B5/T5 | Copies `check-quint.ts`, `quint-lib.ts` and every `runtimeScriptPaths` entry into a temp repo to prove receipts are written as "failed"/"running". Receipts are slated for removal (ci-and-formal). Also depends on the `legacy` family list. | Delete with receipts. | Low |

## Proposed end state
Three or four pure cases (scenario execution parser, metadata validation, counterexample detection, plus the
changed-model selection cases) in `test/tooling/quint.test.mjs`. No floors, no receipt plumbing, no temp-repo copy.
