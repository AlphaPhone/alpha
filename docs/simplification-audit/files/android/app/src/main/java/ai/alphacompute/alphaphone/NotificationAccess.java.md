# android/app/src/main/java/ai/alphacompute/alphaphone/NotificationAccess.java
- Lines: 30 | Role: Alpha's installed identities for the shared `NotificationMirror` (listener notification history) plus 16 static forwards | Verdict: SIMPLIFY
- Importers: main — `AlphaNotificationListener` and `AlphaNotificationsPlugin` (use `MIRROR` only), `AlphaConnectionPlugin:174` (`pause`). androidTest — `CrossAppNotificationsInstrumentedTest`, `CrossAppNotificationsRestartInstrumentedTest`, `NotificationAccessTestDriver` (use `prefs`, `granted`, `listener`, `eventGeneration`, `signature`, `status`, `update`). Text/path pins: `specs/quint/application/manifest.json`, `specs/quint/application/README.md`, `specs/quint/refinement/native/credential-coordinator-platform.mjs`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-29 | D4 (P17) | 15 one-to-one forwards `static X f(Context c) { return MIRROR.f(c); }`. Zero callers anywhere for `component`, `apps`, `list`, `history`, `action`, `redact`, `clearHistoryBoundary` (git grep over android/, test/, specs/); the rest are used only by instrumentation except `pause` (1 production call). | Delete lines 15-29; `AlphaConnectionPlugin` calls `NotificationAccess.MIRROR.pause(...)`; androidTest uses `MIRROR.*` (and wraps JSON → JSObject itself where needed). | Low. |
| 2 | 13 | A7 | `static final Object LOCK = MIRROR.lock;` — no reader (0 hits for `NotificationAccess.LOCK`). | Delete. | None. |
| 3 | 11-12 | C6 | Installed names `"alpha-notification-access"`, `"alpha.notification.history.v1"`, `"notification-history.enc"` are persisted identities. | Keep byte-for-byte. | — |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `MIRROR` | const | 11-12 | — | here |

## Proposed end state
~10 lines: the `MIRROR` constant with its config; no forwards.

## Verification
`CrossAppNotificationsInstrumentedTest`, `CrossAppNotificationsRestartInstrumentedTest` (after mechanical edits), notifications Playwright journey.
