# specs/quint/native/NativeDeletionReviewAdmission.qnt
- Lines: 30 | Kind: Quint model (live, `native` manifest; JVM exhaustive replay) | Verdict: KEEP
- Covers: one native reminder-deletion review lease: at most one admission, at most one settlement, a retired lease is never admitted. Duplicates: none at model level; the Java class is 15 lines (`DeletionReviewAdmission.java`). Callers/importers: `native/manifest.json` (3 tests, 4 invariants, no `bounds`), harness `refinement/native/deletion-review-admission.mjs` (16 lines, compiles the class whole and runs all 81 four-call histories); `test/quint-native-deletion-review-admission.test.mjs`; native aggregate.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1-30 | - | Minimal model of a minimal class; harness is import-shaped and exhaustive. | None. | - |
| 2 | test wrapper | T4, B5 | Run twice; pins `traces 81`, `checkpoints 405`. | One runner; `> 0` (81 is the exhaustive count; keep it only if the owner wants exhaustiveness asserted). | L |

## Proposed end state
Unchanged.
