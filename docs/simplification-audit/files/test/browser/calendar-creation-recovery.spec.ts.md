# test/browser/calendar-creation-recovery.spec.ts
- Lines: 65 | Kind: Playwright, chromium (dev), 10 tests + loop (11 runs); UI with heavy `BrowserCalendar.prototype` patching and module calls (s18 r32, 3 sleeps) | Verdict: MERGE into `journeys/calendar.spec.ts` (3 cases), DELETE the rest
- Covers: creation receipts: a committed save whose response is lost is recovered on reload without a second event; changed arguments under the same `creationId` are refused; cross-tab pending creation; explicit "Create a separate event"; late saves/acknowledgements/permissions cannot overwrite a newer draft. Duplicates: `calendar-form-draft.spec.ts:28-32` (same lost-response recovery via the form); "Check event creation receipts" appears only in these two. Callers/importers: chromium only; imports `helpers/calendar-review.ts`, `helpers/browser-calendar.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10, 29, 33, 37, 44, 49, 56 | P3 | Seven `BrowserCalendar.prototype.{save,acknowledgeCreation,pendingCreations,requestAccess}` patches to lose responses or hold. | In the journey inject at the bridge: the fake `AlphaCalendar` (production lane) commits then rejects, or holds a promise. | Low |
| 2 | 16, 21 | T6 / P7 | `new BrowserCalendar().save(...)` twice to test creation-id idempotency and cross-tab exclusivity: stand-in semantics. | Delete. | Low |
| 3 | 7, 26, 45, 59, 62 | P2 | Counts and reads receipts through `calendarDocument.readRaw()`. | Count events in the rendered day/agenda; read the bridge fake's calls. | Low |
| 4 | 34, 39, 45 | T8 | `waitForTimeout(150/200)` after release. | Poll on the visible state. | None |
| 5 | 6 | — | `draft()` auto-accepts a native `confirm()` "Replace the retained unsaved form…": UI uses `window.confirm`. | Keep the assertion of the message in one case. | None |

## Proposed end state
`journeys/calendar.spec.ts` creation section: (1) save with lost response → reload → "Check event creation receipts" → exactly one event; (2) late committed save does not replace a newer draft (draft/home parametrised); (3) leaving the form while admission is pending writes nothing. All fault injection at the bridge. Delete this file.
