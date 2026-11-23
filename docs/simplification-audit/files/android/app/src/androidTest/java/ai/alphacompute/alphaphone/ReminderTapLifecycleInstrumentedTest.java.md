# android/app/src/androidTest/java/ai/alphacompute/alphaphone/ReminderTapLifecycleInstrumentedTest.java
- Lines: 68 | Role: encrypted reminder tap ledger: capture/dismiss/consume, stale and duplicate routes, repost after unchanged edit, 512-row compaction. | Verdict: KEEP
- Importers: none. Text/path pins: `scripts/ci/pending-recovery-ui.py:24` (`'ReminderTapLifecycleInstrumentedTest','staleDismissDuplicateCaptureAndConsumedCapacityRemainExact','reminderTapLifecycle'`, CI resident-android); `scripts/ci/test-pending-recovery-phases.py:72` (`opt='reminderTapLifecycle'`).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 16-24 | C3 | `post(context,id)`: schedule-ahead/sleep/deliver/find-token, same "post due" sequence as 4 other files. | `ReminderTestSupport.postDue` (+ token lookup). | none |
| 2 | 57 | B1 | `try{taps.capture(older);}catch(ReminderTestAccess.Taps.UnknownTap reclaimed){}` accepts either outcome silently. | Assert the one specified outcome (`assertThrows` if reclamation is required, else no try). | low |
| 3 | 22, 51 | C3 | Iterate ledger rows to find a token by target: written twice. | `tokenFor(store,target,filter)`. | none |
| 4 | 49 | C6 | `"c".repeat(64)` binding vs `ReminderTestAccess.digest(...)` elsewhere. | Use `digest("...")` like the other Reminder tests. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `post` | helper | 16-24 | `ReminderNoticeQuestion.post`, `ReminderTapProcessDeath :49-53`, `ReminderUpgrade :55-58`, `ReminderHeadsUp :51-52` | `ReminderTestSupport.postDue` |

## Proposed end state
Same test; shared post helper, one token lookup, the swallowed `UnknownTap` turned into a specified assertion. ~62 lines.

## Verification
`python3 scripts/ci/pending-recovery-ui.py` (phase `reminderTapLifecycle=1`, owned secondary user); `scripts/ci/test-pending-recovery-phases.py`.
