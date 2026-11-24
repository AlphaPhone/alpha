# test/browser/notification-action-lifecycle.spec.ts
- Lines: 17 | Kind: Playwright spec, chromium, 6 tests (3 events x 2 phases); module-in-page on `AlphaNotifications` and `notificationDocument.edit`, no user action | Verdict: REWRITE as one step in `journeys/notifications.spec.ts` (or DELETE)
- Covers: opening a notification is cancelled if Home, a device-state change or an incoming call arrives before its storage commit, and completes (history "opened") without navigating if it arrives after. Duplicates: `notification-route-lifecycle.spec.ts` (same mechanism for Calendar alerts and hosted results); `dev-notifications.spec.ts` "notification taps open the source app" (happy path). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 4-11 | T6 | Calls `setNotificationPolicy`, `inject`, `open(row)` and swaps `notificationDocument.edit` to pause mid-commit. No click. | Journey: tap a notification in the shade while the harness holds the notification store write; press Home; release; assert the app did not open and the row is still there. One event (Home) is enough. | Low |
| 2 | 3 | T7 | Three window events x two phases = six tests of one cancellation fence. | One case per phase at most. | None |
| 3 | 13 | T6 | Asserts internal `deviceEvents` and history states. | Assert visible shade/history. | Low |

## Proposed end state
One "Home during notification open" step in `journeys/notifications.spec.ts` using a harness `holdStore('notifications')` control. If the harness cannot hold a commit from the UI, delete the file; the fence is a few lines of product code.
