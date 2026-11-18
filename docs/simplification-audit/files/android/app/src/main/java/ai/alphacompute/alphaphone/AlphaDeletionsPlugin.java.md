# android/app/src/main/java/ai/alphacompute/alphaphone/AlphaDeletionsPlugin.java
- Lines: 102 | Role: Capacitor `AlphaDeletions`: pending/undo/dismiss of deferred native deletions and the native-reviewed reminder deletion dialog (manual and agent-proposed), staging through `NativeDeletionCoordinator`. | Verdict: SIMPLIFY
- Importers: `MainActivity` registration; renderer deletion views; androidTest `DailyAppsInstrumentedTest`. Text/path pins: `test/native-deletion-admission.test.mjs`, `test/shared-deletion-window.test.mjs`, `test/support/feature-parity.mjs`, `docs/formal-model-audit-2026-11/07-native.md`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 98, 57 | C4 (P8) | Two different foreground checks in one file: `foreground()` (not finishing/destroyed, window focus, device unlocked) and, in the Delete button handler, `isDeviceLocked()` + `Lifecycle.State.RESUMED`. Line 57 also dereferences `getSystemService(KeyguardManager.class)` without the null check line 98 has. | One `OwnerSurface.check(activity, requireFocus)`; call it in both places. | Medium (audit which subset the dialog tap needs). |
| 2 | 14, 18, 25, 39, 59 | C4 (P10) | `newFixedThreadPool(2)` plus four hand-written `try{worker.execute(...)}catch(RejectedExecutionException ...)` blocks. | Base `background(call,work,closedMessage)`; reuse `PluginWorkers.submit`. | Low |
| 3 | 18-19 | C1 | `private interface Task{JSONObject run()throws Exception;}` — twin of `AlphaGmailPlugin.Work`, `AlphaFilesPlugin.StorageWork`, `HostedDelivery.NativeSourceWork`, `AlphaLocalAgentPlugin.ProviderChange`. | `java.util.concurrent.Callable<JSONObject>`. | None |
| 4 | 87, 96 | B4 | `catch(JSONException impossible)` around `new JSONObject().put("status",String)`. | One `private static JSONObject status(String)` that wraps once (or use `JSObject` which does not throw). | None |
| 5 | 20-22, 44-46, 73, 79 | — | `NativeDeletionCoordinator.get(getContext())` and `AlphaReminders.engine(getContext())` re-fetched per line. | Local variables. | None |
| 6 | 18, 56, 69 | D8 | 400+ character lines (task wrapper, dialog builder, catch chain). | Formatter + extract `buildReview(...)`. | None |
| 7 | 69 | B1 | `catch(RuntimeException ignored){/* The review already settled. */}` on `dismiss()` — documented, keep. | Keep. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Task` | interface | 19 | `AlphaGmailPlugin.Work`, `AlphaFilesPlugin.StorageWork`, `HostedDelivery.NativeSourceWork`, `AlphaLocalAgentPlugin.ProviderChange` | `Callable<JSONObject>` |
| `task(call,action)` | helper | 18 | `AlphaConnectionPlugin.submit`, `AlphaDevicePlugin.diagnostics`, `AlphaActionJournalPlugin.clockWork` | base `background` |
| `foreground()` | helper | 98 | `AlphaCalendarPlugin:92,112`, `AlphaDevicePlugin.shareForeground:30` | `OwnerSurface` |
| `unstaged(...)` | helper | 94-97 | `AlphaCalendarPlugin:59-64` (same "receipt after failed stage" fallback) | `NativeDeletionCoordinator.receiptOrUnknown(kind,id)` |
| `finishStatus/finishResult/finishFailure` | helper | 87-92 | — | here |

## Proposed end state
~90 lines: shared background helper and owner-surface check, `Callable` instead of `Task`, one status builder, the receipt-after-failure fallback shared with `AlphaCalendarPlugin`. Dialog copy ("Delete reminder?", "Its alert pauses now. You can undo for 10 seconds.") unchanged.

## Verification
`DailyAppsInstrumentedTest`, reminder deletion instrumentation (`ReminderDeletionStorageInstrumentedTest`), `test/native-deletion-admission.test.mjs`, `test/shared-deletion-window.test.mjs`; Playwright deletion journeys.
