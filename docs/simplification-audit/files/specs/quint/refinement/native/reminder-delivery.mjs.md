# specs/quint/refinement/native/reminder-delivery.mjs
- Lines: 90 | Kind: Quint refinement driver (host JVM; whole upstream `ReminderEngine`/`ReminderStore`/`ReminderEnvelope`/`ReminderReceiver`/`ReminderTaps`/`SecureStringStore` + product `AlphaReminders`, `ReminderReceiver`) | Verdict: KEEP; SIMPLIFY (use `java.mjs` runner, drop env knobs and text checks)
- Covers: Reminder delivery: stale/early alarms, permission revoked at delivery, blocked due channel, notification vs refused durable post, ambiguous commit, route/platform refusal recovery, reboot once-per-boot, boot-marker memory/disk disagreement, snooze and repeat decisions, daily completion fencing old actions, null-occurrence rows, reviewed receipts, silent rows, direct-arm rollback, decision write failure. Model `NativeReminderDelivery`. Duplicates: none. Callers/importers: `native/index.mjs:51,195`, `test/quint-native-reminder-delivery.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 55-77 | C3 | Own `javac`/`java`/`jar` pipeline instead of `javaTraceCampaign` (`java.mjs:33-55`); two JDK discoveries (`jvm-tools.javaBinary` vs `java.mjs executable`). | Extend `javaTraceCampaign` with a classpath option (Android org.json) and use it. | Low |
| 2 | 25-34 | T9 | `ALPHA_REMINDER_ANDROID_JSON_JAR` and `ALPHA_REMINDER_JSON_ABI` are set by nothing (`git grep` hits only this file); two ABI modes double the support matrix. | Pick one org.json source (Android SDK 36 `android.jar` is already required by the Android build) and delete the knobs. | Low |
| 3 | 49 | T1 | Regex on `AndroidManifest.xml` for an unexported `ReminderReceiver`. | Move to the manifest/APK audit. | None |
| 4 | 50-54 | B5 | Asserts no patch targets and sha equality with the pin. | Delete. | None |
| 5 | 16-22 | A1/D14 | `legacy-null-occurrence-retires-on-reschedule` covers upstream `legacyAlarm` rows (delete-candidates B43, open, upstream). Upstream still ships it. | Keep until upstream drops it. | — |

## Proposed end state
~50 lines on the shared JVM runner: compile, run 17 scenarios, `checkTraces`. No env knobs, no manifest regex, no pin re-checks.
