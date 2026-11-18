# specs/quint/refinement/native/ReminderDeliveryTraces.java
- Lines: 455 | Kind: Quint refinement harness (product `AlphaReminders` + `ReminderReceiver` with the pinned upstream `ReminderEngine/Store/Envelope/Taps/Receiver`, against generated Android ports) | Verdict: KEEP (runner SIMPLIFY)
- Covers: live model `specs/quint/native/NativeReminderDelivery.qnt`: reminder alarm delivery: stale and early alarms do not post, permission/channel refusal and explicit restore, visible-before-durable-save and ambiguous commit, tap/Ask route ledger, boot restore once per boot and marker disagreement, Snooze/Done per occurrence, daily recurrence advance, reviewed `operate` receipts and replay, arm refusal rollback. 17 scenarios. Duplicates: androidTest reminder suites cover the device path; no host test replays this. Runs in `test/quint-native-reminder-delivery.test.mjs` and the aggregate (`index.mjs:195`).
- Callers/importers: `reminder-delivery.mjs` (`checkNativeReminderDelivery`), `reminder-delivery-platform.mjs` (Android ports with `notices.beforePost`, `alarms.beforeArm`, fault switches).

## How it is tied to product code
- Whole-file compile, no slicing. Product config consumed through `AlphaReminders.CONFIGURATION` (all channel ids, actions, URI prefixes, extras), so renames are picked up automatically.
- Reflection: private `ReminderStore.selectedRow` (136), static `ReminderEngine.ENGINES`/`CLAIMS` (312-316), `engine.store.persistence.quarantined`. A package-local `System` class shadows `currentTimeMillis` for the upstream package.
- Runner asserts the AndroidManifest receiver line by regex (`reminder-delivery.mjs:49`, T1-style) and that upstream files are unpatched and sha-equal to `upstream.lock.json`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 246-255, 422-426 | A1 (upstream-bound) | `legacy-null-occurrence-retires-on-reschedule` seeds a row in `CONFIG.legacyName` (`alpha-local-reminders-v1`) and checks the upstream upgrade path. D1 would delete it, but upstream `ReminderConfiguration` requires a non-null distinct `legacyName` and always runs the upgrade. | Keep while upstream requires it; add an upstream follow-up (D14) for an optional legacy store, then delete the scenario, `seedLegacy`, the `legacy` observed field and the model's legacy action together. | Low |
| 2 | runner 25-34, 61-74 | C3 / C7 | `reminder-delivery.mjs` has its own javac/java/jar pipeline and Robolectric/SDK `android.jar` discovery instead of `java.mjs:javaTraceCampaign`. | Teach `java.mjs` an optional extra classpath and reuse it. | Low |
| 3 | runner 49 | T1 | Regex on `AndroidManifest.xml` for the receiver's `exported="false"`. That is a release rule. | Move to the APK/manifest build audit (`verify-apks`) and drop here. | Low |
| 4 | 136-138, 312-316 | T10 (reflection) | Private upstream members pinned. | Keep; list in header. | Low |
| 5 | campaign | T4 | Per-model test plus aggregate. | One runner. | None |

## Proposed end state
Keep all scenarios (legacy one until upstream allows dropping it). Runner reuses `java.mjs`; manifest check moves to
the APK audit; executed once from the native family runner.
