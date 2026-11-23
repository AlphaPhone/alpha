# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CalendarDeletionRestartInstrumentedTest.java
- Lines: 81 | Role: deferred Calendar deletion survives a real process stop (undo inside window / expiry after) in prepare→verify→replay phases | Verdict: KEEP (minor SIMPLIFY)
- Importers: none. Run by `scripts/test-native-calendar-deletion-restart.ts:14` (`calendarDeletionRestart`, `restartRun/Mode/Phase`); listed in `CAMPAIGN_RUNNERS`. Text/path pins: that script (argument names, `calendarRestart*` result keys at line 79).

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 27-32, 44-46, 74-76 | C3 | `present()`, `calendars(account)` sync URI, owned calendar insert and exact cleanup (15 files). | `CalendarProviderFixture`. | Low |
| 2 | 37 | B3 (ok) | Validates the runner-supplied run id / mode / phase — trust boundary (instrumentation args); keep. | none | — |
| 3 | 79 | B5 / A7 | `addResults(calendarRestartRun/Phase/Pid)` — `git grep calendarRestartRun` finds only this line; no runner reads the keys (process identity is already asserted in-test at 56 and 72). | Delete line 79. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `present` | helper | 27-31 | CalendarDeletionReview:46, CalendarAgentCrud.exists:51 | `CalendarProviderFixture` |
| `calendars(account)` | helper | 32 | CalendarDeletionReview:53, CalendarCreationRecovery:37, CalendarUpgrade:58,79 | `CalendarProviderFixture` |

## Proposed end state
Same phases on the shared provider fixture. Est. ~70 lines.

## Verification
`node scripts/test-native-calendar-deletion-restart.ts ARCHIVE OUTPUT VARIANT undo` and `… expiry`.
