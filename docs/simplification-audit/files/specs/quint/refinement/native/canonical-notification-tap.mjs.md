# specs/quint/refinement/native/canonical-notification-tap.mjs
- Lines: 64 | Kind: Quint refinement driver (Node; builds sliced actor/bridge Java via `canonical-tap-platform.mjs`, compiles with pinned `ForegroundNoticeGate`, runs `CanonicalTapTraces.java`) | Verdict: KEEP; PORT via the platform
- Covers: model `CanonicalNotificationTap` (live): notification-tap custody, verification, expiry and one-shot acknowledgement. Duplicates: `test/quint-canonical-notification-tap-refinement.test.mjs` (T4); `test/quint-canonical-notification-tap-admission.test.mjs` (a different admission model); host tests `canonical-notification-navigation/security.test.mjs` (see their reports). Callers: `index.mjs:47`, the wrapper test.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 37-38 | T10 | Product classes enter only as text through `canonicalTapPlatform` (see that report). | Port with the platform. | Medium |
| 2 | 25 | B5 | `AlphaLocalAgentPlugin.java` and `MainActivity.java` are in `sources` (hashed) though not compiled or sliced. | Drop them from sources. | Low |
| 3 | 29-33, 39 | B5 | `pinned(gate)` is called only for its hash assertion. | Shared pin helper. | Low |

## Proposed end state
Driver compiles the whole `AlphaCanonicalNotifications`/`AlphaNotificationsPlugin` classes with shared ports; same traces and obligations.
