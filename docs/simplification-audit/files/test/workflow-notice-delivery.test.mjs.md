# test/workflow-notice-delivery.test.mjs
- Lines: 17 | Kind: integration on the host JVM (javac of real `WorkflowNoticeDelivery.java`, `WorkflowNoticeTaps.java` and prepared notice sources, plus three fixture mains `WorkflowNoticeDeliveryTest`, `WorkflowNoticeRecoveryTest`, `WorkflowNoticeTapsTest`) | Verdict: KEEP, move to Gradle JVM tests merged with `workflow-approval-notice.test.mjs`
- Covers: native workflow notices are delivered at most once across crashes and replay; recovery and tap handling. Duplicates: `quint-workflow-notice-delivery-refinement.test.mjs` (Java replay of the same classes), `test/browser/workflow-notice-taps.spec.ts` (renderer side). Callers/importers: `npm test` glob; `fixtures/native-source.mjs`, `fixtures/jvm-tools.mjs`, the three `test/fixtures/WorkflowNotice*Test.java` files (sole importer).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9 | T9 | `jvmSkip('json')` silently skips without the jar. | Gradle declares it. | Low |
| 2 | 12 | C5 | Same javac boilerplate as `workflow-approval-notice.test.mjs`; javac of ~10 files per run (~5-10 s). | One Gradle suite. | None |
| 3 | 12-15 | T4 | Check whether the Quint Java replay already compiles and runs the same classes; if so, keep the JUnit tests for crash/replay cases the model does not reach and drop overlaps. | Review during the port. | Low |

## Proposed end state
`android/app/src/test/java/ai/alphacompute/alphaphone/WorkflowNoticeTest.java` (JUnit) with delivery, recovery, taps and approval-notice cases; this wrapper and its staging through `native-source.mjs` are deleted.
