# test/workflow-approval-notice.test.mjs
- Lines: 17 | Kind: integration on the host JVM (javac of real `WorkflowNoticeDelivery.java`, `WorkflowNoticeTaps.java` and prepared notice sources via `fixtures/native-source.mjs`, plus `test/fixtures/WorkflowApprovalNoticeTest.java`) | Verdict: KEEP, move to Gradle JVM tests (`android/app/src/test/.../WorkflowNoticeTest.java`) merged with `workflow-notice-delivery.test.mjs`
- Covers: phone-step approval notices post once per approval, expire, reopen after restart and withdraw on decision. Duplicates: `specs/quint` workflow notice delivery refinement (`quint-workflow-notice-delivery-refinement.test.mjs`, Java replay), `test/browser/workflow-notice-lifecycle.spec.ts` (renderer side). Callers/importers: `npm test` glob; `fixtures/native-source.mjs`, `fixtures/jvm-tools.mjs`, `fixtures/WorkflowApprovalNoticeTest.java` (only importer).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | T9 | `skip: jvmSkip('json')`: silently skipped when the org.json jar is absent. | In Gradle the dependency is declared; no skip. | Low |
| 2 | 11-15 | C5 | Same javac/java/temporary-dir boilerplate as `workflow-notice-delivery.test.mjs`. | One Gradle test class family. | None |
| 3 | 15 | B5 | Success is a `PASS …` stdout line, not test results. | JUnit assertions. | None |

## Proposed end state
`WorkflowApprovalNoticeTest.java` becomes a JUnit test in `android/app/src/test` (no staging copy, no `native-source.mjs`), run by `./gradlew testDebugUnitTest`; this wrapper is deleted.
