# android/app/src/main/java/ai/alphacompute/alphaphone/CalendarScopedDeletionReview.java
- Lines: 87 | Role: Native ticketed review dialog and dispatch for versioned (v2) scoped Calendar deletions. | Verdict: SIMPLIFY
- Importers: `AlphaCalendarPlugin` (inspect/review/pause/destroy), `NativeDeletionCoordinator` (`dispatch`). Text/path pins: `specs/quint/native/manifest.json`; `specs/quint/refinement/native/{ScopedCalendarReviewTraces.java,deletion-platform,scoped-calendar-review}.mjs`; androidTest `CalendarDeletionRestartInstrumentedTest`, `ScopedCalendarDeletionInstrumentedTest`; `test/support/feature-parity.mjs` (allowlist path)

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 24 | C3 | `granted(Context)` READ+WRITE calendar check; twins `CalendarSyncBridge.java:47,219`, `NativeDigestHost:33,35`, `AlphaCalendarPlugin:111`. | One `CalendarPermissions.readWrite(context)` helper. | none |
| 2 | 25-26 | C4 | `foreground()` and `reviewForeground()` hand-rolled owner checks (isDeviceLocked, hasWindowFocus, lifecycle RESUMED, dialog focus); twins in CalendarSyncBridge:48, ClockAgentReview:48-51, AlphaDeletionsPlugin, AlphaGmailPlugin ... | One `OwnerSurface.check(activity, dialog)` helper with explicit options; audit each caller's PRD flow (keyguard vs device-locked differs). | medium |
| 3 | 23 | C3 | `status(String)` JSObject builder; twin `CalendarSyncBridge.java:46`. | Shared helper. | none |
| 4 | 46, 52, 56, 60 | P10 | Own single-thread executor + `catch(RejectedExecutionException closed)` twice. | Shared background-worker helper (PluginWorkers or base class). | low |
| 5 | 37 | C3 | Builds `delete2:` identity string by hand. | Use `CalendarDeletionIdentity` encoder. | low |
| 6 | 80-86 | C5 | `dispatch(Context,JSONObject)` (permission check, revision CAS, dispatch, verify, conflict/unknown mapping) parallels `CalendarSyncBridge.dispatchDeletion` (218-225). | Share the `dispatched?"unknown":"conflict"` skeleton in one `CalendarDispatch.run(...)` helper. | low |
| 7 | 26, 38, 41, 57 | D8 | 400-700-char lines. | Formatter. | none |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| Ticket | class | 21 | - | stay |
| status | helper | 23 | CalendarSyncBridge:46 | shared util |
| granted | helper | 24 | CalendarSyncBridge:47,219; NativeDigestHost:33; AlphaCalendarPlugin:111 | CalendarPermissions |
| foreground/reviewForeground | helper | 25-26 | 10 owner-foreground copies | OwnerSurface |

## Proposed end state
Ticket store, inspect/review/show/dispatch remain; permission/foreground/status/executor helpers shared; ~70 lines. Estimated lines after: 70.

## Verification
androidTest Scoped/CalendarDeletionRestart; Quint scoped-calendar-review.
