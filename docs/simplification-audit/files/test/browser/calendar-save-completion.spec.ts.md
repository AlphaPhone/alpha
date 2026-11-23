# test/browser/calendar-save-completion.spec.ts
- Lines: 16 | Kind: Playwright, chromium (dev), 1 test × 3 (`stay`/`home`/`new-draft`); UI with `BrowserCalendar.prototype.save/list` held (s2 r13) | Verdict: MERGE into `journeys/calendar.spec.ts` (shared "late completion" case with `calendar-delete-completion`)
- Covers: after editing an event the refresh waits for completion and never replaces the screen the user moved to (same event, Home, a new draft); one save; video flag kept. Duplicates: `calendar-delete-completion.spec.ts` (same shape for delete). Callers/importers: chromium only; imports `helpers/browser-calendar.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | P3 | Patches `BrowserCalendar.prototype.save` and `.list` to hold the post-save refresh. | Hold at the bridge (`range`/`list` answer) in the journey. | Low |
| 2 | 15 | P2 | Reads events via `calendarDocument.readRaw()`. | Assert the event detail heading and Join button. | None |
| 3 | 5 | D8 | Setup is one 500-character line. | Formatter. | None |

## Proposed end state
Merged into the parametrised `late Calendar completion never replaces a newer screen` case ({edit-save, delete} × `new-draft`, plus `stay` for edit). Delete this file.
