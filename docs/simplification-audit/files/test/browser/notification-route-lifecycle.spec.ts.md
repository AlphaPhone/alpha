# test/browser/notification-route-lifecycle.spec.ts
- Lines: 25 | Kind: Playwright spec, chromium, 12 tests (2 sources x 3 events x 2 phases); module-in-page on `BrowserCalendar` and `browserHostedResults`, store `edit` swapped | Verdict: DELETE the hosted half; REWRITE the Calendar half as one step in `journeys/notifications.spec.ts` (or DELETE)
- Covers: a Calendar alert action and a hosted-result notification action are cancelled by Home/device-state/incoming-call before their commit and complete without routing after it. Duplicates: `notification-action-lifecycle.spec.ts` (same fence), `reminder-notification-dismissal.spec.ts` (Calendar alert dismissal). Callers/importers: none.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-15 | A3 (D5) | The `hosted` source drives `browser/hosted-results.ts` with an `https://agent.example` route: hosted-agent workflow results, which D5 removes where no production build reaches them. | Delete the hosted cases with that code; keep only if the owner says hosted results stay. | Low |
| 2 | 6-10 | T6 | Constructs `BrowserCalendar`, saves an event, replaces `calendar.open`, calls `alertAction`. | Journey: Calendar alert in the shade, tap Open while the calendar store write is held, press Home, assert no navigation and the alert not dismissed. | Low |
| 3 | 3 | T7 | 12 variants of one fence. | One case. | None |

## Proposed end state
Hosted cases deleted. The Calendar alert case joins the single "navigation during notification action" step in `journeys/notifications.spec.ts`; or the file is deleted if that harness control is not built.
