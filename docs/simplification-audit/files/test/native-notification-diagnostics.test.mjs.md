# test/native-notification-diagnostics.test.mjs
- Lines: 42 | Kind: mixed: real `NativeNotificationDiagnostics.java` on the JVM, plus a transplant of the `private void fail(` method sliced from `AlphaCanonicalNotifications.java` (marker `/** Capture only`) into a fake `Actor` | Verdict: MERGE the diagnostics half into `test/integration/android-jvm.test.mjs`; DELETE the sliced `fail` half
- Covers: notification diagnostics log only finite stage/family/route labels (never secrets, URLs or unknown routes); an authority failure stops the actor while a transient one schedules one retry and a stale failure is not logged. Duplicates: none found for the log-label bound. Callers/importers: `npm test` glob; `jvm-tools.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-11, 23 | T2 | Pastes a product method into a fake class with invented fields (`attempt`, `failures`, `SERIAL`). | Delete that half; if the retry rule matters, extract it into a small class during the AlphaCanonicalNotifications cleanup and test that. | Medium: retry vs stop on authority failure loses host coverage. |
| 2 | 26-33 | - | Real class, privacy-relevant (no secret in logs). | Keep. | None |
| 3 | 13-39 | T7 | Java in template strings. | Committed fixture. | None |

## Proposed end state
One android-jvm case: `NativeNotificationDiagnostics` with a recording `android.util.Log` stub; every logged row matches
the finite label pattern and an unknown route is not logged.
