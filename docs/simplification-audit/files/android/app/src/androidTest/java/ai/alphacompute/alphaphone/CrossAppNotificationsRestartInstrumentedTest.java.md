# android/app/src/androidTest/java/ai/alphacompute/alphaphone/CrossAppNotificationsRestartInstrumentedTest.java
- Lines: 96 | Role: seven-phase distinct-process campaign (prepare, restore, pause, restorePaused, resumeAndRevoke, verifyRevoked, cleanup) proving notification policy, history, capability invalidation and mock pause survive process death. | Verdict: SIMPLIFY
- Importers: none; uses `NotificationAccessTestDriver`. Text/path pins: `scripts/test-cross-app-notifications.ts:20,109` (`#processPhase`, args `crossNotificationsRestart`, `notificationPhase`, `notificationRunId`; phase names). Manual campaign only.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 41-94 | D9 | One `processPhase` method dispatching seven phases with early `return`s (`if("prepare".equals(phase)){…return;}` …) | Split into seven private methods selected by a `switch(phase)` | Low |
| 2 | 15-24 | C3 | Atomic checkpoint save/load (`AtomicFile`, format 1, runId) — same idea as `CombinedAgentRestart.stateFile/loadCheckpoint`, `HostedProcessRestart` STATE slot | Shared `PhaseCheckpoint` helper for multi-process campaigns | Low |
| 3 | 69 | C5 / D8 | ~900-char prefs restore line (twin of CrossAppNotifications:82) | `NotificationAccessTestDriver.restorePrefs` | Low |
| 4 | 34-36 | C5 | `fixtureIdentity()` twin of CrossAppNotifications:44-48 | Move to driver | None |
| 5 | 28-30 | C3 | `live()`, `settings()`, `click()` re-implement navigation waits | `AppNavigation.open(view)` / `clickText` | None |
| 6 | 5 | A7 | Unused `import android.os.SystemClock;` | Delete | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `checkpointFile`/`save`/`load`/`stage` | helper | 15-24 | CombinedAgentRestart:123-124, HostedProcessRestart STATE slot | `PhaseCheckpoint` |
| `ids`/`stringSet`/`jsString` | helper | 25-27 | none | keep |
| `confirmResume` | helper | 31-33 | AlertDialog button1 clicks in CloudSignInAuthorization:50 | `UiNodes.clickDialogPositive` |
| `fixtureIdentity`/`verifyNoRetainedForeignData` | helper | 34-40 | CrossAppNotifications:44-48 | `NotificationAccessTestDriver` |

## Proposed end state
Same phases and argument names (pinned by the script); one method per phase; shared checkpoint, prefs restore and fixture
identity. Estimated 96 -> ~85 lines (mainly readability).

## Verification
`node scripts/test-cross-app-notifications.ts` (restart phases) on a disposable emulator with the fixture apps installed.
