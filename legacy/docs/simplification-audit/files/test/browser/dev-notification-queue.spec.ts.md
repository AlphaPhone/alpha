# test/browser/dev-notification-queue.spec.ts
- Lines: 31 (6 tests) | Kind: Playwright `chromium`, dev build with `tools=1`; module-in-page tests of the `AlphaNotifications` browser stand-in (15 `/src` imports), 1 UI test of the developer notification editor | Verdict: **DELETE**
- Covers: injected device events survive reload and appear once a policy collects them; replacement keys are scoped per source app; secret, ongoing and keep-after-opening semantics survive restart; a failed open does not navigate; lock retires old action tokens; the developer "Post notification" editor edits and removes events; two tabs serialise replacements. Duplicates: `dev-notifications.spec.ts` (rendered shade, policy, redaction when locked, taps open the source app, failed policy writes, history clear) and `notification-action-lifecycle.spec.ts`. Callers/importers: `chromium` project.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-21, 25-31 | T6 | Five tests call `inject`, `list`, `open`, `dismiss`, `setNotificationPolicy`, `removeDeviceEvent` directly; no rendered shade. | Delete. | Medium: per-app replacement-key scoping and "a stale removal cannot erase a replacement" lose coverage (browser stand-in only; Android uses the native listener). |
| 2 | 18 | P3 | `IDBObjectStore.prototype.put` patch for `alpha.browser.notifications.v2`. | Gone. | none |
| 3 | 22-24 | P7 | The developer "Development notification" editor is a simulator dialog. | Delete; `dev-notifications.spec.ts` already drives device event controls through the shade. | Low |
| 4 | 19-20 | T4 | Lock/unlock then open navigates to Inbox: covered by `dev-notifications` "notification taps open the source app" and "locked notifications redact previews". | Delete. | none |

## Proposed end state
Deleted. Notification behaviour lives in `journeys/notifications.spec.ts`, built from `dev-notifications.spec.ts`.
