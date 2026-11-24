# test/browser/reminder-notification-dismissal.spec.ts
- Lines: 86 | Kind: Playwright, chromium (`?mode=dev`); module-in-page (9 `/src` imports, no user action): constructs `BrowserDaily` and `BrowserNotifications` directly, wraps their methods or `notificationDocument.edit` to hold a dismissal; 11 generated tests | Verdict: **DELETE** (optionally one case to `test/integration/browser-daily.test.mjs`)
- Covers: a held single or batch reminder-notice dismissal is rejected if, before it commits, the device locks, the reminder is edited, a new occurrence appears, the source resets or alerts are disabled; a dismissal survives reload and a later occurrence shows again. Duplicates: these are the browser stand-in's (`browser/daily.ts`, `browser/notifications.ts`) guards; on a phone the same rule is native (`DailyApps`), covered by Android instrumentation. Notification list/dismiss UI is in notification specs (other chunks). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 9-54 | T6 / T3 | Direct construction with `undefined as any` collaborators and method wrapping; no click. A unit test of the browser stand-in in a browser costume. | Delete. If the race guard is wanted outside Android, one Node integration case on the real module. | Low |
| 2 | 20-27 | B2 (test) | `daily[method]?.bind(daily)` with a fallback branch that patches `notificationDocument.edit` "if the method is absent". The test hedges against its own target's API. | Gone with the file. | none |
| 3 | 63 | – | Row named `legacy` is just an already-dismissed occurrence, not legacy data. | – | none |

## Proposed end state
File deleted. The "dismissed notice stays dismissed after reload; a new occurrence reappears" rule, if not already in the
notifications journey, becomes one UI step there (dismiss in the shade, reload, check).
