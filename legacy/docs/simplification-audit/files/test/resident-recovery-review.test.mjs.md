# test/resident-recovery-review.test.mjs
- Lines: 42 | Kind: unit JVM (real `ResidentRecoveryReview.java` with inline Java main) + source-text of `AlphaLocalAgentPlugin.java` | Verdict: DELETE
- Covers: native recovery confirmation token is single-use and bound to epoch/credential intent; plugin consumes before archiving. Duplicates: `specs/quint/refinement/native/resident-coordinator.mjs` compiles and traces `ResidentRecoveryReview.java` with the plugin. Callers/importers: `npm test` glob; `jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-33 | T3/T4 | Unit test of a 30-line class already exercised by the resident refinement. | Delete. | Low |
| 2 | 34-42 | T1 | `indexOf` ordering and regexes over plugin source. | Delete. | Low |

## Proposed end state
File deleted; the Quint resident model covers the review token rules.
