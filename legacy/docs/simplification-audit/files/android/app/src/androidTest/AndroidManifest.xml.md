# android/app/src/androidTest/AndroidManifest.xml
- Lines: 23 | Role: the test-APK manifest. It declares two instrumentation runners (`AndroidJUnitRunner`, and `WorkflowNoticeProcessRunner` in process `:workflowNoticeTest`), a share receiver in a different UID and an autofill fixture activity. | Verdict: KEEP
- Importers: the Gradle androidTest source set. Users: `scripts/android-workflow-native.ts:97-106` (runner `WorkflowNoticeProcessRunner`) and `scripts/android-instrumentation.ts:236,292`. `PhotosMultiShareInstrumentedTest.java:50` and `ShareFlowAssertions.java:71` find the receiver by its label "Alpha share verification", which pins the text on line 9. `PasswordVaultFillInstrumentedTest` uses `PasswordFillFixtureActivity`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 8-17 | — | The share tests use `ShareReceiverActivity`, finding it by its label. | None. | — |
| 2 | 18-21 | A3 check | This is the autofill fixture for `PasswordVaultFill`. PRD AP-10 lists "eligible autofill", so the feature is in scope. | None. | — |
| 3 | 9 | C6 | Two Java files match the label "Alpha share verification" as text. | Optional: move it to a shared constant in `ShareFlowAssertions`. | — |

## Local types and helpers
None.

## Proposed end state
Unchanged (23).

## Verification
`node scripts/android-instrumentation.ts` with the campaigns `PasswordVaultFill` and the share tests; `scripts/android-workflow-native.ts --phase=approval-notice-recovery`.
