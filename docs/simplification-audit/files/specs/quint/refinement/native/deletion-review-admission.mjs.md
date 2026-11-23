# specs/quint/refinement/native/deletion-review-admission.mjs
- Lines: 16 | Kind: Quint refinement driver (one whole app class, exhaustive finite sequences) | Verdict: KEEP
- Covers: `DeletionReviewAdmission.java` admit/retire/settle over every ordered 4-call sequence; model `NativeDeletionReviewAdmission` (native manifest, live). Duplicates: the same campaign is run by `test/quint-native-deletion-review-admission.test.mjs` and by the native aggregate `index.mjs:187` (T4). Callers/importers: those two.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | — | T4 | Run twice per verify. | Drop from aggregate. | None |
| 2 | 12-15 | B5 | Assumption prose in receipt. | With the receipt decision. | None |

## Proposed end state
Unchanged; run once by its own test, path-filtered to `DeletionReviewAdmission.java`, the model and this folder.
