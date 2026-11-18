# specs/quint/native/DeviceActions.qnt
- Lines: 171 | Kind: Quint model (live registration; mostly superseded) | Verdict: DELETE (each part is owned by a more precise live model)
- Covers: SMS review/journal/single dispatch/multipart/delivery evidence, a reminder creation/fire/snooze/stop ticket, and contact-read currency, in one state. Duplicates: SMS → `NativeSmsDispatch.qnt` (`OneRadioCallPerRecipient`, `RadioNeedsDurableIntent`, `multipartReportDoesNotProveDeliveryTest`, `DeliveryNeedsSentAndReport`; its harness `refinement/native/sms-dispatch.mjs:19` compiles the same `SmsSendJournal`); reminders → `NativeReminderDelivery.qnt` (`snoozeRetainsOccurrenceAndDoneRetiresItTest`, `uncertainOperationReplayDoesNotArmTest`, `silent` rows) and `NativeClockReview.qnt` (header line 2 says so); contacts read → `ContactsBook.qnt` (`ListCurrent`, `staleReadAfterPauseTest`). Callers/importers: `quint:check` (8 runs); `refinement/native/JournalTraces.java:81-166` `smsTraces()` (the only executed part, per obligation `native/index.mjs:222`: "Only the real SMS journal executes in these traces"); prose in `specs/quint/native/README.md`, `specs/quint/application/README.md`, `docs/formal-model-audit-2026-11/*`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 54-79, 133-139 | T4 / C5 | SMS dispatch invariants restate `NativeSmsDispatch` at a coarser grain (one id, 1–2 parts). | Delete; `NativeSmsDispatch` is the owner. | Low |
| 2 | 85-121, 140, 143 | T4 | Reminder ticket/snooze/creation-replay restates `NativeReminderDelivery`. | Delete. Check `staleReminderTicketTest` (old revision fire after snooze/stop does not post) has a counterpart in `NativeReminderDelivery` (`oldAndEarlyAlarmsDoNotPostTest`); add one there if not. | Low |
| 3 | 45-53, 141-142 | T4 | Contact read currency restates `ContactsBook.ListCurrent`. | Delete. | None |
| 4 | name | D11 | Model name collides with the TS class `DeviceActions` (`apps/app/src/runtime/device-actions.ts:87`, used across `connection-ui.tsx` and `scripts/test-*.ts`), which is the agent device-action coordinator modelled by `application/DeviceActionReview`. Every `git grep DeviceActions` mixes the two. | Removed with the model. | None |
| 5 | JournalTraces.java 81-, 166 | — | The `DeviceActions` key in `JournalTraces.main` and `smsTraces()` exist only for this model. | Delete `smsTraces()` and the key (the SMS journal is already executed by `sms-dispatch.mjs`). Remove obligation `native/index.mjs:222`; `test/quint-native-refinement.test.mjs` derives expected receipts from the manifest, so it follows. | Low |
| 6 | manifest `sources` | — | Ten Alpha sources (`aosp-telephony.ts`, `aosp-image.ts`, `sms-agent-contract.ts`, `sms-subscription-revision.ts`, `reminder-creations.ts`, `reminder-deletions.ts`, `AlphaImageCapabilities.java`, `AlphaTelephonyPlugin.java`, `AlphaReminders.java`, `ResidentScheduleRearm.java`) are pinned but none is executed. | Removed with the entry; this also stops `quint:changed` re-running it on unrelated telephony edits. | None |

## Proposed end state
File, manifest entry, `JournalTraces.smsTraces()` and its obligation row are deleted. SMS, reminder and contact
properties stay proved by `NativeSmsDispatch`, `NativeReminderDelivery`/`NativeClockReview` and `ContactsBook`, each
with an executing harness. At most one reminder scenario is copied into `NativeReminderDelivery` if missing.
