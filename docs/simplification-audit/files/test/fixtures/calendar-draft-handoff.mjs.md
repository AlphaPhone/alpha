# test/fixtures/calendar-draft-handoff.mjs
- Lines: 56 | Kind: Playwright-in-node:test helper (user steps against the mounted renderer; one `page.evaluate` backdoor) | Verdict: MERGE into the calendar journey helpers (`test/browser/journeys/calendar.spec.ts` fixture)
- Covers: retain/resume/discard a Calendar event draft, open a note, schedule from a note, scan-to-calendar review. Duplicates: Calendar draft Playwright specs (45 Calendar specs per tests-browser). Callers/importers: `test/calendar-mounted-draft-handoff.test.mjs`, `calendar-mounted-edit-admission.test.mjs`, `calendar-mounted-editor.test.mjs` (research: move to test/browser), `test/quint-canonical-calendar-draft-handoff.test.mjs`, live Quint `canonical-calendar-draft-handoff.mjs`, `canonical-calendar-editor-close.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 47-55 | T6/A5 | `reviewNote` calls `notes.vo/ed.toEvent/toCal` through `renderVals()` because "the owner removed these controls from the Notes menu": it drives an action no user can reach. | Delete `reviewNote` and the scenarios that need it, or decide the controls are retired and delete the product action too (owner question). | Medium |
| 2 | 13-16 | T6 | `goHome` dispatches `launcher-home` instead of a user gesture. | Acceptable as the Android home-key analogue; name it so. | Low |
| 3 | 1-3, 56 | D4 | Re-exports `startMountedCalendar` and the camera-review helpers: a pass-through barrel. | Import from the source modules. | none |

## Proposed end state
User-step helpers (`retainCalendarDraft`, `discardCalendarDraft`, `reviewCalendarDraftDiscard`, `openNote`) move into the calendar journey fixture on the shared `test.extend` harness. The Quint harnesses import the same helpers from there. `reviewNote` goes unless the owner keeps note-to-event.
