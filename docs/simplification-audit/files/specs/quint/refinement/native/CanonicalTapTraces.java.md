# specs/quint/refinement/native/CanonicalTapTraces.java
- Lines: 279 | Kind: Quint refinement driver (host-JVM; real `AlphaCanonicalNotifications` actor and `AlphaNotificationsPlugin` bridge, generated from product text by `canonical-tap-platform.mjs`, with package-local shadow classes) | Verdict: KEEP; PORT the platform generation away from text rewriting
- Covers: canonical notification tap custody: tap capture strips the route, waiting/pending slots, owner/agent authority, expiry boundary, read-ack compare-and-clear never replays, newer taps survive older verification, suspend/restart and destroyed bridge. Duplicates: none in host tests. Callers: `native/canonical-notification-tap.mjs:23,46`; `native/canonical-tap-platform.mjs:62` (`SystemClock` stub calls `CanonicalTapTraces.elapsedRealtime`); test `test/quint-canonical-notification-tap*.test.mjs` via the native family.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 33-50 | T2-lite | Declares package-local `System`, `ElizaAgentService`, `NativeOwnerReminderHost`, `NativeNotificationProjector`, `AlphaLocalAgentPlugin` in `ai.alphacompute.alphaphone` so the compiled actor binds to fakes; shadowing `java.lang.System` is surprising. The actor/bridge text is pre-processed by `canonical-tap-platform.mjs` (T10 lives there). | Keep the stubs (that is how host-JVM ports work) but move them into the platform's generated stub set with a comment; replace the `System` shadow with a `Clock` port the actor already reads if one exists. | Low |
| 2 | 55-58, 120-126, 165-166 | — | Reflection into private fields `active`, `pendingTap`, `waitingTap`, `identity`, `session`, `owner`, `fence` and method `consumeWaitingTap`. Coupled to private names. | Acceptable; a test-source-set accessor would be cleaner (D7 says not in main source). | Low |
| 3 | 225-278 | — | Nine scenarios in one JVM; `Fixture` constructor resets statics. | Keep. | — |

## Proposed end state
Unchanged scenarios; stubs grouped with the platform port files; the platform stops rewriting product text (see `canonical-tap-platform.mjs` report in its chunk).
