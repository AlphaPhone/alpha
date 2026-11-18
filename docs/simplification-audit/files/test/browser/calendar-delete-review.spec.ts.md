# test/browser/calendar-delete-review.spec.ts
- Lines: 59 | Kind: Playwright, chromium (dev, `tools=1`), 3 tests; real UI (s4 r19, clock) | Verdict: MERGE into `journeys/calendar.spec.ts`
- Covers: Delete event shows one review naming the event; Cancel, Escape and system Back delete nothing; reload does not replay the review; confirmed delete enters a 10 s Undo window then removes exactly that event; an event changed while the review is open is not deleted; a second plugin-level remove is refused. Duplicates: Delete dialog also in `dev-calendar-series.spec.ts`, `dev-calendar-alerts.spec.ts`, `journey-b-voice-note-actions.spec.ts`. Callers/importers: chromium only; imports `helpers/browser-calendar.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 28 | P2 | System Back via `window.dispatchEvent(new Event('alpha-back'))`. | Harness `systemBack()` (one home for the event). | None |
| 2 | 45 | P2 | Concurrent edit via `calendarDocument.edit(...)` in page. | Keep (it is the "another window" boundary) but through a harness `storage.editCalendar()`; or a second page editing via UI. | Low |
| 3 | 55-56 | T6 | Second request through `registerPlugin('AlphaCalendar').remove` directly. | Delete this half; the UI cannot issue a second Delete while the modal is open, which is what matters. | None |
| 4 | 6 | P2 | `titles()` reads raw store. | Read the rendered list. | None |

## Proposed end state
Delete-review case in `journeys/calendar.spec.ts`: Cancel/Escape/Back keep the event, reload shows no review, Delete → Undo visible → after 11 s only the other event remains; one sub-case for "changed while open". About 25 lines. Delete this file.
