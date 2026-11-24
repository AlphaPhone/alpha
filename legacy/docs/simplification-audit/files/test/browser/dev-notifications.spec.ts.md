# test/browser/dev-notifications.spec.ts
- Lines: 74 (18 KB, minified) | Kind: Playwright, chromium project; mixed: 5 module-in-page tests of the `BrowserNotifications` stand-in (T6/P7) + 5 Settings/shade UI journeys | Verdict: REWRITE as `journeys/notifications.spec.ts`
- Covers: notification collection policy, preview redaction, history retention/clear, channel and access controls, and tap-to-open, all against the browser stand-in for the native `AlphaNotifications` plugin. Duplicates: `notification-action-lifecycle.spec.ts`, `notification-route-lifecycle.spec.ts`, `notifications-handle.spec.ts`, `dev-notification-queue.spec.ts` (tap/route/lifecycle), `notification-storage-migration.spec.ts` (storage lane). Callers: Playwright chromium project only (not in `scripts/storage-specs.ts`).

Signals: 24 `page.evaluate`, 24 in-page `/src` imports (18 × `platform-plugins.ts`), 67 role/text queries, 44 actions, 4 prototype patches, no sleeps.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-15, 16-19, 36-45 | T6, P7 | Tests 1, 2, 5 never touch the UI: `registerPlugin('AlphaNotifications')` in `page.evaluate`, then assert the stand-in's revision CAS, 100-row history cap, 24 h expiry and lock queueing. The APK replaces this with the Java plugin, so these prove the double. | Delete. | Low: product rules live in the native plugin and its instrumentation. |
| 2 | 39-40 | C6, T6 | Hard-codes the internal Web Lock name `["browser-document","alpha.browser.documents.v1","alpha.browser.notifications.v2"]` and polls `navigator.locks.query()`. | Delete with test 5. | None. |
| 3 | 41, 68, 73 | P3 | Patches `IDBObjectStore.prototype.put` and `BrowserNotifications.prototype.setNotificationPolicy` to inject failure and delay. | Fault injection through the shared harness bridge (`harness/bridge.ts`) or a storage quota, not product-class surgery. | Medium: tests 9-10 are the only check that Settings disables/re-enables controls around a policy write. |
| 4 | 55-60 | T6 | Compares `notificationApps()` with `ElizaSystem.listLauncherApps()` and launches through `launchApp` in-page: stand-in identity plumbing. | Delete. | None. |
| 5 | 31, 47, 52 | P2 | `openChannelSettings` / `openNotificationAccess` reached through evaluate, not a visible control. | In the journey, open them from Settings → Notifications (the visible "Manage development notification access" button exists, line 64). | Low. |
| 6 | 34 | B5 | `page.screenshot({path:'test-results/dev-parity-ui/notifications.png'})`: an artifact nothing reads (and a stale `dev-parity-ui` folder name). | Drop. | None. |
| 7 | 2 | T7, C6 | Inline `alpha.connection.selection.v1` seed (one of ~339 copies). | Harness `app` fixture option. | None. |
| 8 | 22-24 | T6 | Locked redaction asserted via `notices.list()`/`open()` in-page. | Assert the redacted row in the rendered shade after Device controls → Power. | Low. |

## Proposed end state
`journeys/notifications.spec.ts` (dev-surface harness, typed bridge) carries five cases:
1. Settings → General → Notifications: enable collection, choose Mail, allow previews; post via Device controls → Post notification; row visible in shade; Clear all removes it (lines 26-35).
2. Locked device shows "Mail" with no preview text in the shade; unlock restores (lines 20-25, UI form).
3. History view → Clear with Cancel then Clear; Back closes the access dialog (lines 61-65).
4. A pending policy write disables "Choose notification apps"; a failed write re-enables it and leaves collection off (lines 67-74, harness fault injection).
5. Tapping "Open Mail" in the shade opens Inbox (line 51).
Everything else is deleted. Needs: harness `app` fixture (offline seed, `?mode=dev&tools=1`), `nav.ts` Settings helper, bridge fault-injection hook.
