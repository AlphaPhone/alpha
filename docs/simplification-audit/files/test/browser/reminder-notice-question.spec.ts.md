# test/browser/reminder-notice-question.spec.ts
- Lines: 24 | Kind: Playwright, chromium, real "Ask about selected content" review opened from a durable reminder tap with a question; uses `helpers/delivery-fixture` + resident agent; `owner-changed` disconnects through an in-page `connectionController` import; 4 generated tests | Verdict: **MERGE** into `journeys/notifications.spec.ts` (together with `gmail-notice-question.spec.ts`, as that chunk proposed)
- Covers: tapping "Ask" on a reminder notification opens a review prefilled with the reminder title and body; Use places it in the conversation and consumes the tap once; Cancel releases the tap without consuming it and it can reopen; a changed source or owner refuses Use in place and keeps the tap. Duplicates: `gmail-notice-question.spec.ts` (same review, mail source); `reminder-notice-taps.spec.ts` (tap consumption). Callers/importers: imports `helpers/delivery-fixture`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14 | T6 | `connectionController.disconnect()` imported in-page. | Disconnect via Settings, or have the resident fixture change the owner. | Low |
| 2 | 7 | – | Tap delivery forced by setting fixture state and dispatching `visibilitychange`. That is how the native tap arrives; acceptable. | Keep inside the notifications fixture. | none |
| 3 | 9 | – | Screenshot nothing compares. | Drop. | none |

## Proposed end state
In `journeys/notifications.spec.ts`, one "Ask about a notification" describe parameterised by source (reminder, mail) with the four
outcomes (compose, cancel, source changed, owner changed).
