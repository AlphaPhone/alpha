# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderTimingInstrumentedTest.java
- Lines: 151 | Role: explicit reminder timing (due time, alert minutes, "None") and reviewed creation receipts, via the `DailyApps` bridge and `AlphaActionJournal`, in denied and granted notification phases. | Verdict: SIMPLIFY
- Importers: none. Text/path pins: `scripts/ci/pending-recovery-ui.py:24` (two phases: `noAlertBridgeWithoutPermissionRestoresAndCompletesWithoutDelivery` / `reminderTiming=none`, `numericLeadDueTimeStaleTargetsAndLegacyReceiptsRemainBound` / `reminderTiming=numeric`; CI resident-android). The method name `...LegacyReceiptsRemainBound` is pinned there.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 142, 145-148 | A1 | "Legacy" rows (scheduled without explicit timing, no `timingVersion`) and their historical receipts must stay bound. Within the renamed package every reminder the product writes carries explicit timing (bridge `reminderTimingVersion` 2, `:109`); timing-less rows come only from the upstream `schedule(...)` overload the test calls directly. | Owner/upstream decision: if upstream keeps the timing-less API for other consumers keep the check; otherwise delete lines 142, 145-148 and rename the method (update `pending-recovery-ui.py`). | medium |
| 2 | 50-59 | C3 (none) | `assertJsonEquals` deep JSON compare with numeric normalisation: only here (grep: 1 file). | Keep; move to a shared `TestJson` only if a second user appears. | none |
| 3 | 43-49 | C3 | `bridge`/`pluginBridge` "nativePromise + poll window.__x" = `PhotosTrash.nativeCall`, `ReminderDeletionStorage.invoke`. | `WebViewTestDriver.nativeCall(plugin,method,args)`. | none |
| 4 | 37 | C6 | Alarm PendingIntent with literal action/URI (see ReminderAgent report). | `ReminderTestSupport.alarm`. | none |
| 5 | 63-105, 109, 136 | D8 / D9 | `createFlow` is 43 lines with nested loops and a `viaBridge` branch that also exercises the action journal; lines 109 and 136 hold 8-15 statements each. | Split: `createViaEngine`, `createViaBridgeAndJournal`, `recurringCreation`, `occupiedAndMalformed`. | none |
| 6 | 84 | D7 | Test removes `action-journal:v1:<scope>:entry/index` slots directly with `AlphaCredentialStore`, pinning the journal's slot naming. | Clean through the journal plugin, or accept with a comment. | low |
| 7 | 90, 100, 103, 119, 123-124, 140-144 | D8 | try/fail/catch x9. | `assertThrows`. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `admitted(phase)` | helper | 26-29 | none | keep |
| `timing(due,lead)` | helper | 31 | none (but `ReminderRecovery :49` builds the same JSON inline) | `ReminderTestSupport.timing` |
| `operate(c,id,type,fields)` | helper | 32-36 | none | keep |
| `alarm` | helper | 37 | ReminderAgent, ReminderUpgrade, ReminderLifecycle | `ReminderTestSupport` |
| `assertJsonEquals` | helper | 50-59 | none | keep |
| `creation(due,lead)` | helper | 60-62 | none | keep |

## Proposed end state
Two phase methods kept; `createFlow` split into named steps; shared bridge/alarm helpers; `assertThrows`; legacy-timing
assertions removed if owner/upstream agrees (with the method rename pinned in `pending-recovery-ui.py`). ~135 lines.

## Verification
`python3 scripts/ci/pending-recovery-ui.py` phases `reminder-no-alert` and the numeric phase (CI resident-android).
