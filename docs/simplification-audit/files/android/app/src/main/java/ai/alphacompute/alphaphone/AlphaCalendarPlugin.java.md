# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaCalendarPlugin.java
- Lines: 169 | Role: Capacitor `AlphaCalendar` = shared `CalendarPlugin` with Alpha's calendar identity, plus deferred agent deletion review, scoped deletion, Google sync bridge, free/busy reads, option readback and ACTION_INSERT hand-off. | Verdict: SIMPLIFY
- Importers: `MainActivity`; main `CalendarSyncBridge`, `CalendarScopedDeletionReview`, `CalendarCreationStore` (CONFIGURATION), `ResetBeforeDispatch`; androidTest `CalendarAgentCrudInstrumentedTest`, `CalendarUpgradeInstrumentedTest`, `ResetExternalFixtureInstrumentedTest`; renderer `native-calendar-sync.ts`, `calendar-adapter.ts:262` (`readOptions`). Text/path pins: `scripts/ci/calendar-bridge.init.gradle`, `scripts/ci/calendar-bridge.py`, `specs/quint/application/manifest.json`, `specs/quint/native/manifest.json:3110,3165`, `specs/quint/refinement/native/{CalendarSyncEnableTraces.java,ScopedCalendarReviewTraces.java,calendar-sync-enable*.mjs,deletion-platform.mjs,scoped-calendar-review*.mjs}`, `test/calendar-range-reader.test.mjs`, `test/ci-pin-bound-scripts.test.mjs`, `test/fixtures/CalendarListWindowTest.java`, `test/native-deletion-admission.test.mjs`, `test/native-plugin-teardown.test.mjs`, `test/reset-cloud-revocation.test.mjs`, `test/reset-wiring.test.mjs`, `test/resident-native-ci-admission.test.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 92, 112, 121, 126, 137, 144 | C4 (P8) | Local owner-foreground predicates `foreground()` (not finishing/destroyed, window focus) and `unlocked()` (`!isDeviceLocked`), combined by hand 4x as `!foreground()OR!unlocked()`. Twins: `AlphaDeletionsPlugin.foreground()` (:98, includes lock), `AlphaDevicePlugin.shareForeground` (:30), `CalendarScopedDeletionReview:25-26`, `CalendarSyncBridge:48`. | Use one `OwnerSurface.check(activity, requireFocus)`; keep `foreground()` without lock for `executeAgent`/`insertHandoff` where the PRD flow allows it (audit each). | Medium: different subsets may be intentional. |
| 2 | 111 | C3 (P9) | `readGranted()` READ_CALENDAR check; twins in `CalendarSyncBridge:47,219`, `CalendarScopedDeletionReview:24`, `NativeDigestHost:33,35`. | Shared `CalendarPermissions.read(context)`. | Low |
| 3 | 91 | C3 | `private static JSObject status(String value)` identical in `CalendarScopedDeletionReview:23`, `CalendarSyncBridge:46`. | One package helper (e.g. `PluginResults.status`). | Low |
| 4 | 37, 75-79 | C4 (P10) | Own `newSingleThreadExecutor` + raw `try{deleteOwnerWorker.execute(...)}catch(RejectedExecutionException retired){...}`. | Base `background(call,work)` helper; same cancelled resolution. | Low |
| 5 | 66-80 | D8 / D9 | `executeAgent` override: 15 lines with an anonymous `PluginCall` subclass, nested lambdas and a 400-char line 78. | Split into `admitDeleteReview(id)`, `captureOwner(ticket)` and `dispatchOnUi(...)`. | Low |
| 6 | 128, 150 | B1 | `catch(Exception unavailable){c.resolve(status("unavailable"));}` — "unavailable" is the specified status in the Javadoc; acceptable. | Keep. | — |
| 7 | 24 | A8 | Class Javadoc "Keep installed calendar/journal identity stable while sharing provider behavior." | "Alpha's calendar identity on the shared CalendarPlugin." | None |
| 8 | 103 | D7 | `readOptions` "for display and tests": renderer calls it (`calendar-adapter.ts:262`), so keep; drop "and tests". | Comment only. | None |
| 9 | 86-90 | C4 (P18) | Three `LateLaunch.ask(call,()->super.x(call))` overrides — the per-plugin workaround repeated in 11 files. | Fix once in upstream base plugin. | Low |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `DeleteOwner` | class | 38 | `DeletionReviewAdmission` (used by AlphaDeletionsPlugin) is a related ticket type | keep |
| `status(String)` | helper | 91 | `CalendarScopedDeletionReview:23`, `CalendarSyncBridge:46` | shared helper |
| `foreground()` / `unlocked()` | helper | 92, 112 | `AlphaDeletionsPlugin:98`, `AlphaDevicePlugin:30`, `CalendarSyncBridge:48`, `CalendarScopedDeletionReview:25` | `OwnerSurface` |
| `readGranted()` | helper | 111 | `CalendarSyncBridge:47,219`, `CalendarScopedDeletionReview:24`, `NativeDigestHost:33` | `CalendarPermissions` |
| `deleteOwnerWorker` | executor | 37 | 25 executors in main (P10) | base plugin |

## Proposed end state
~150 lines: identity constants, plugin methods unchanged in contract, foreground/permission/status helpers imported, `executeAgent` split into named steps, executor handled by the shared background helper.

## Verification
`CalendarAgentCrudInstrumentedTest`, `CalendarDeletionRestartInstrumentedTest`, calendar availability Playwright specs, Quint scoped-calendar-review and calendar-sync-enable refinements, `test/native-deletion-admission.test.mjs`, `test/native-plugin-teardown.test.mjs`, `scripts/ci/calendar-bridge.py` (CI emulator bridge).
