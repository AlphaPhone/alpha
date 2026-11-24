# android/app/src/androidTest/java/ai/alphacompute/alphaphone/WorkflowNoticeProcessRunner.java
- Lines: 4 | Role: Empty `AndroidJUnitRunner` subclass declared as a second `<instrumentation>` in `android/app/src/androidTest/AndroidManifest.xml:4-6` with `targetProcesses=":workflowNoticeTest"`, so process-death tests run in a helper process that outlives main. | Verdict: KEEP
- Importers: manifest only. Text/path pins: `android/app/src/androidTest/AndroidManifest.xml:4`; `scripts/android-workflow-native.ts:16,106`; `scripts/ci/pending-recovery-ui.py:96`; `scripts/ci/test-pending-recovery-phases.py:76`; `scripts/native-test-fixture.ts:154`; `scripts/test-calendar-regression.ts:107`; `scripts/test-installed-upgrade.ts:64`; `scripts/android-instrumentation.ts:292`; `test/fixtures/isolated-native-campaign.mjs:53`; `test/installed-upgrade-runner.test.mjs:35`; `test/native-campaign-evidence.test.mjs:49,70,93`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4 | D11 | Name says "WorkflowNotice" but `ReminderTapProcessDeathInstrumentedTest` also runs under it; it is a generic helper-process runner. | Optional rename to `HelperProcessRunner` — touches 13 pinned references and the `:workflowNoticeTest` process name; not worth it unless done with the process-death consolidation. | Medium (many pins). |

The empty subclass is required: a manifest `<instrumentation>` needs a distinct class name to run in a different target process (not a P17 empty-wrapper case).

## Proposed end state
Unchanged (4 lines).

## Verification
None needed unless renamed; then `node --test test/native-campaign-evidence.test.mjs test/installed-upgrade-runner.test.mjs` and `python3 scripts/ci/test-pending-recovery-phases.py`.
