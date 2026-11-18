# specs/quint/refinement/native/DeletionReviewAdmissionTraces.java
- Lines: 41 | Kind: Quint refinement harness (Java, real `DeletionReviewAdmission`, exhaustive 81 sequences) | Verdict: KEEP
- Covers: model `NativeDeletionReviewAdmission` (live): every ordered sequence of four `admit`/`retire`/`settle` calls on the real CAS token; admissions and settlements counted from return values. Duplicates: `test/native-deletion-review-admission.test.mjs` javac-compiles the same class and checks the same transitions plus a 200-iteration two-thread race (the concurrency part is not covered here). The sequential checks in that host test are a subset of these 81 traces.
- Callers/importers: `deletion-review-admission.mjs` (`checkNativeDeletionReviewAdmission`), run by `test/quint-native-deletion-review-admission.test.mjs` and aggregate `index.mjs:189`. Compiles `android/.../DeletionReviewAdmission.java` (product verdict KEEP).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10 | T10 | Reads private `AtomicInteger state` by reflection and maps 0/1/2 to names. | Fine for a 41-line harness; an exported `phase()` would be D7. Leave. | None |
| 2 | — | T4 | Sequential cases duplicated by the host test. | In `native-deletion-review-admission.test.mjs` keep only the race loop (or move the race into this harness as an extra trace-free check) — see that file's report. | None |
| 3 | campaign | T4 | Runs in per-model wrapper and aggregate. | One runner. | None |

## Proposed end state
Unchanged. The exhaustive sequence campaign is the coverage for the token; the host test keeps only its concurrency race.
