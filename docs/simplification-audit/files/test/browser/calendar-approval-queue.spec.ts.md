# test/browser/calendar-approval-queue.spec.ts
- Lines: 31 | Kind: Playwright, chromium (dev), 1 test × 2 themes; opens the dialog by in-page import of `reviewCalendarApproval` and `calendarApprovalFromList` (s3 r4) | Verdict: REWRITE as one case in `journeys/calendar.spec.ts` driven through the approval queue UI, or DELETE if the approval queue is hosted-only (owner question)
- Covers: the Calendar approval dialog shows calendar, local time, guest e-mail and Notify guests, keeps Approve/Decline reachable at 150 % text, re-reads the approval at the tap, and returns `approve`. Duplicates: `test/calendar-approval-ui.test.mjs` (esbuild transplant), `test/quint-calendar-approval-review.test.mjs` + `specs/quint/refinement/application/calendar-approval-review.mjs` (Quint replay of the same re-read rule). Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7-14 | T6 | Builds the row and calls `reviewCalendarApproval(read,signal,…)` with hand-made callbacks; the product entry is `prototype/calendar-approval-adapter.ts:50` via `connectionController.readCalendarApproval`. | Drive the queue from a fixture approval list served by the connection harness and tap the queue item. | Medium: needs the approval route in the harness. |
| 2 | 10 | P2 | `BrowserDevice.prototype.setTextScale` in-page. | Harness `setTextScale`. | None |
| 3 | 3 | T4 | Light/dark loop doubles a geometry check. | One theme. | None |
| 4 | 27 | B5 | Screenshot with no consumer. | Drop. | None |

## Proposed end state
One case in `journeys/calendar.spec.ts`: a pending `schedule_event` approval appears, its dialog lists calendar, time, guest and notify flag, Approve is reachable and posts one `approve` decision after a fresh read. Delete this file and the T2 host test `calendar-approval-ui.test.mjs` once the journey exists; the Quint model stays.
