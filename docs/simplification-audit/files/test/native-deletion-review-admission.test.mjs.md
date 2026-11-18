# test/native-deletion-review-admission.test.mjs
- Lines: 42 | Kind: host-JVM unit of the real `DeletionReviewAdmission.java` with an inline harness | Verdict: DELETE
- Covers: the deletion review CAS retires queued work, keeps admitted work and settles once under races. Duplicates: Quint `specs/quint/native/NativeDeletionReviewAdmission.qnt` with `specs/quint/refinement/native/deletion-review-admission.mjs` + `DeletionReviewAdmissionTraces.java` (compiles the same class), and `test/quint-native-deletion-review-admission.test.mjs`. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-42 | T4 / T3 | Same class, same states, smaller trace set than the model replay. | Delete. | Low |

## Proposed end state
File deleted; the Quint replay is the single proof.
