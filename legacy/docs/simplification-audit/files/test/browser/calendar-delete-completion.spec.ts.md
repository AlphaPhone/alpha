# test/browser/calendar-delete-completion.spec.ts
- Lines: 35 | Kind: Playwright, chromium (dev), 1 test × 3 (`event`/`home`/`new-draft`); UI with `BrowserCalendar.prototype.remove` held (s3 r13, clock) | Verdict: MERGE into `journeys/calendar.spec.ts` (one parametrised "late completion" case shared with `calendar-save-completion`)
- Covers: a deletion whose completion arrives after the user moved on (another event, Home, a new draft) does not disturb the newer view and the Undo window still deletes exactly one event. Duplicates: Undo/Pending deletions also in `calendar-delete-review.spec.ts`; same late-completion shape in `calendar-save-completion.spec.ts`. Callers/importers: chromium only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14-18 | P3 | Patches `BrowserCalendar.prototype.remove` to hold. | Hold at the bridge fake. | Low |
| 2 | 32-34 | P2 | Reads events via `calendarDocument.readRaw()`. | Assert the remaining event in the list. | None |
| 3 | 4 | T4 | Three boots for one rule. | Keep `new-draft` (strictest); `home` is covered by the save-completion twin. | None |

## Proposed end state
One case `late Calendar completion never replaces a newer screen` parametrised over {delete, edit-save} in `journeys/calendar.spec.ts`. Delete this file.
