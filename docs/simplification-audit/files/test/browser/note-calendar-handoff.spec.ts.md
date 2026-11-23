# test/browser/note-calendar-handoff.spec.ts
- Lines: 303 | Kind: Playwright spec, chromium, 5 tests, 240 s timeout, fake clock; tests 1-4 on legacy Notes seeded through `/src`, test 5 on the canonical Notes fixture | Verdict: MERGE test 5 into `journeys/notes.spec.ts` (Notes to Calendar step); DELETE tests 1-4
- Covers: a note's action items become an event or reminder draft that writes nothing until Save; the saved record shows "From note: <title>" and opens exactly that note, or fails closed ("Deleted note", "Source gone"); links store identity only; one draft on double activation; draft survives reload. Duplicates: `journey-b-voice-note-actions.spec.ts` (same retained scheduling contract), `helpers/note-schedule-contract.ts`. Callers/importers: none; imports `helpers/note-schedule-contract.ts`, `helpers/legacy-notes.ts`, `helpers/browser-calendar.ts`, `helpers/canonical-notes.ts`, `app-navigation.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11, 26-55, 72-80 | A1 | Tests 1-4 seed recordings into legacy `browser-notes-document.ts`, select "Previous/Older notes" and assert links into it. D1 deletes this source. | Delete tests 1-4. Carry to the canonical step: nothing saved before Save; stored link has only id fields and no title/text; deleted note shows "Deleted note"/"Source gone"; double Save makes one record. | Coverage: fail-closed link and double-activation under canonical Notes |
| 2 | 17-20 | T6 | Reads four stores through `/src` imports (`readBrowserNotesRaw`, `reminderDocument.readRaw`, `calendarDocument.readRaw`, `readNoteOrigins`). | Keep `readNoteOrigins` only to assert the link holds no content (privacy rule); read events/reminders from the visible Calendar. | Low |
| 3 | 2, 95, 107 | T6 | Entry is `reviewNoteScheduleContract` ("programmatic entry; no scheduling menu control"); test 1 asserts the menu entries are gone. | If the product has no user-reachable entry, ask the owner whether the scheduling contract is still a feature; a journey must start from a user control or Alpha chat. | Medium (owner question) |
| 4 | 14, 30 | T8 | `test.setTimeout(240_000)`; `page.clock.install` while real timers run. | Canonical step needs neither. | None |
| 5 | 43-44 | C5 | Hand-written WAV header (also in `note-audio-lifecycle.spec.ts`). | Gone with tests 1-4. | None |

## Proposed end state
One step in `journeys/notes.spec.ts` (or `journeys/calendar.spec.ts`, whichever owns the hand-off): canonical note, open its reminder draft, assert no writes before Save, Save once (double click), "From note: Venue plan" opens the same record, link stores no content, a deleted note fails closed. Roughly 40 lines.
