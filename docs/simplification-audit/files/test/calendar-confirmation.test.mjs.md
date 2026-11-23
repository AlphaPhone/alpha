# test/calendar-confirmation.test.mjs
- Lines: 17 | Kind: transplant (`new Function` over `prototype/calendar-confirmation.ts` with imports/exports regex-stripped, fake `BrowserReviews`, `connectionController`, `alphaClient`, `document`) | Verdict: DELETE; REWRITE the drift case as a step of `journeys/calendar.spec.ts`
- Covers: a pending Calendar delete confirmation admits once and retires (aborts) on view, drawing, context, owner or visibility drift. Duplicates: none exact; `test/browser/calendar-delete-review.spec.ts` drives the dialog. Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2, 7 | T2 | Source regex-stripped and evaluated with injected globals; any import change breaks it. | Delete. | Low |
| 2 | 11 | - | Single admission (second call returns false while one is pending). | Journey: double-tap Delete opens one dialog. | Low |
| 3 | 12-17 | - | Retirement on drift; the user-visible cases are "leave Calendar" and "screen hidden" while the dialog is open. | Journey step: open delete review, leave to Home, return: dialog gone, nothing deleted. | Low |

## Proposed end state
Deleted. `journeys/calendar.spec.ts` (delete section, from `calendar-delete-review.spec.ts`) gains "double tap opens
one review" and "leaving Calendar retires the review without deleting". Owner/context drift is covered by the approval
Quint replays.
