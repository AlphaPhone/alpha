# specs/quint/native/NativeReminderDelivery.qnt
- Lines: 259 | Kind: Quint model, live (listed in `specs/quint/native/manifest.json`, read by `scripts/check-quint.ts` and `scripts/check-quint-refinement.ts`); harness compiles real `AlphaReminders`/`ReminderReceiver` with the pinned upstream reminder engine (javac via `test/fixtures/jvm-tools.mjs`) | Verdict: KEEP (drop the legacy seed action)
- Covers: Reminder delivery: no early publication, old/early alarms do not post, permission denial needs explicit reschedule, ambiguous saves quarantine, boot-marker restore and retry, snooze vs done, daily civil occurrence skipping, reviewed-operation receipts that never re-arm on replay (9 runs, 4 invariants). Duplicates: none in Alpha (upstream reminder engine emulator tests are a separate D14 question, cross-file-actions Q-AND-20). Callers/importers: manifest (10 sources incl. `AndroidManifest.xml` and 7 upstream reminder classes); `specs/quint/refinement/native/reminder-delivery.mjs` (+`reminder-delivery-platform.mjs`, `ReminderDeliveryTraces.java`); `test/quint-native-reminder-delivery.test.mjs`; also re-run by the family aggregate `specs/quint/refinement/native/index.mjs` (`test/quint-native-refinement.test.mjs`); `native/README.md`

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6, 18, 39-46, 93, 124-129, 190 | A1 | `seedLegacy`, the `legacy` field and the `occurrence == 0 and s.legacy` match model upstream `ReminderStore`'s `legacyAlarm` rows (`ReminderStore.java:168-169,310,395,420`). Alpha installs as a new package with empty data, so no legacy row can exist; `ReminderDeliveryTraces.java` never drives it. The reader itself is upstream (D14) and stays. | Delete `seedLegacy`, its `step` entry, the `legacy` field and the `legacy` disjunct in `deliver`; leave the rest. Report the upstream reader as a D14 follow-up. | Low; harness never exercised it |
| 2 | harness `reminder-delivery.mjs:2,9,69-72` | C3 | Own `javac` discovery (`execFileSync`, `javaBinary`) instead of `java.mjs`'s `javaTraceCampaign`. | Use `java.mjs` (research helper ledger: "Java runtime discovery"). | Low |
| 3 | test + `index.mjs` | T4 | Runs twice. | One runner. | None |
| 4 | harness | B5 | `checkTraces` re-hashes every input before and after the run (`driverHashes`, `inputsUnchanged`) and the wrapper test asserts exact trace counts. | Pass/fail only. | None |

## Proposed end state
Model stays live without the legacy seed path; harness uses the shared Java runner; one runner; path-filtered to `AlphaReminders.java`, `ReminderReceiver.java`, the manifest and the upstream reminder plugin.
