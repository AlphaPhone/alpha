# test/calendar-sync-cloud-refusal.test.mjs
- Lines: 13 | Kind: source transplant on host JVM (regex `private static String cloudFailure\([^\n]+` cut out of `CalendarSyncBridge.java`, pasted into a fake class with a stand-in `LocalAgentProviderAdmission.CloudReadFailure`) + source-text count | Verdict: DELETE; PORT the status table to the Gradle calendar-sync JVM test after extracting the method
- Covers: Calendar Cloud read failures 408/429/5xx are "unavailable" (retryable) and 4xx are "context-changed", never authorising a mutation. Duplicates: none. Callers/importers: `npm test` glob.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4, 7-8 | T2 / T10 | One-line regex cut of a Java method plus a hand-written stand-in for its parameter type. | Move `cloudFailure` to a Capacitor-free place (e.g. a static on `LocalAgentProviderAdmission.CloudReadFailure`) and test it directly. | Low |
| 2 | 11 | T1 | Asserts the exact catch clause appears twice in the bridge source. | Delete. | None |
| 3 | - | D18 | The Android sync bridge is kept (D18), so the rule stays relevant. | Keep the 9-status table. | - |

## Proposed end state
File deleted. One table method in the Gradle calendar-sync JVM test class (with consent, receipt recovery, mutation and
snapshot) over the extracted classifier.
