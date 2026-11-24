# specs/quint/refinement/native/canonical-tap-platform.mjs
- Lines: 107 | Kind: Quint harness platform (assembles Java classes from text of product `AlphaCanonicalNotifications.java`, `AlphaNotificationsPlugin.java`, upstream `NotificationsHostPlugin.java` and `NativeNotificationRoute.java`) | Verdict: PORT
- Covers: compile environment for the canonical tap campaign: actor custody methods, bridge read/ack/lifecycle methods, route whitelist, synthetic Intent/Context/PluginCall/JSObject. Callers: `canonical-notification-tap.mjs:8,37`.

## Text anchors (T10)
- `AlphaCanonicalNotifications.java`: field regex `^ private (static )?(volatile )?... <name>(=...)?;` for `active, waitingTap, waitingTapAt, pendingTap, restoring, context, stopped, stream, session,identity, owner,fence`; `TAP_WINDOW_MS`; `restoration`; constructor line; slice `' static void stop()'` .. `' private void connect()'`; everything from `' static void captureTap('` to the last `}`.
- `AlphaNotificationsPlugin.java`: `' private static java.lang.ref.WeakReference<AlphaNotificationsPlugin>'` .. `' @Override protected String appLabel()'`, with `@PluginMethod ` removed.
- Upstream `NotificationsHostPlugin.java`: one-line members `protected interface NoticeWork`, `noticeWork(`, `requireNoticeForeground(`.
- Upstream `NativeNotificationRoute.java`: package line rewritten to `ai.alphacompute.alphaphone`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 15-31 | T10 | Twelve field regexes plus two region slices of `AlphaCanonicalNotifications` (android P8 hot spot: static schedulers, swallowed catches). Formatter (D9) or the planned cleanup breaks every regex, because they require one-line declarations at one-space indent. | Make the tap custody a separate class (`CanonicalTapCustody.java`: waiting/verified slots, `captureTap`, `canonicalPending`, `acknowledgeCanonical`) with the clock and read port injected; compile it whole. | High (blocks D9 on this file) |
| 2 | 56-57 | T10 | Bridge body sliced between a field and an override and annotations stripped. Same slice idea as `workflow-notice-platform.mjs`. | Compile the whole `AlphaNotificationsPlugin` against one shared Capacitor/`NotificationsHostPlugin` stub set used by both harnesses. | Medium |
| 3 | 60 | T10 | Copies an upstream class into the product package by rewriting its package line. | Compile it in its own package and import it. | Low |
| 4 | 64-104 | C5 | Intent/Context/PluginCall/JSObject stubs; a fourth `PluginCall` variant across native harnesses. | Shared stubs. | Low |

## Proposed end state
No slicing: a whole `CanonicalTapCustody` class plus the whole bridge compiled against shared Capacitor/host stubs; this file shrinks to port definitions.
