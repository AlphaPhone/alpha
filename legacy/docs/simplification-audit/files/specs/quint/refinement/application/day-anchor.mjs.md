# specs/quint/refinement/application/day-anchor.mjs
- Lines: 124 | Kind: Quint refinement harness (trace replay; real bundled Calendar/Reminder adapters through `calendar-adapter-fixture.mjs`) | Verdict: KEEP (its text dependency is in the shared fixture, which is PORTed separately)
- Covers: Calendar form day anchoring across midnights: creation, edit and plain reminder forms save to the intended day, rows re-read on the midnight timer or resume, remount re-anchors. Duplicates: none found (no other model or Playwright spec replays midnight crossings against the real adapters). Callers/importers: `test/quint-day-anchor.test.mjs` only (not in `refinement/application/index.mjs`, so no aggregate duplicate).
- Model: `specs/quint/application/DayAnchor.qnt`, live in `application/manifest.json` (sources `prototype/calendar-adapter.ts`, `calendar-form-draft-adapter.ts`, `calendar-edit-draft-adapter.ts`, `calendar-days.ts`, `reminder-adapter.ts`, `runtime/reminder-creations.ts`; all exist). Manifest pins 11 symbols (`msToLocalMidnight` twice).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-3, 120 | T10 | Imports the real adapters via `buildCalendarAdapter`, but that fixture inserts closure probes by matching declaration text in the bundled output (`calendar-adapter-fixture.mjs:44-47`). Reads `shell.calendarDraftAnchor`, `calendarEditDraftAnchor`, `calendarPlainFormAnchor` instance fields. | Port happens in the fixture (export the anchors or read them from the shell, which already works); no change here. | Low |
| 2 | 37-39 | T6 | Replaces `Shell.prototype.refreshReminders` with a stand-in that publishes `reminderEvents(reminders)`; the reminder adapter's own refresh does not run. | Acceptable port; document it in the `assumptions` like the other harnesses (this one has none). | Low |
| 3 | 41 | D9 | `rerender` runs `componentDidUpdate` three times as a fixed point guess. | Loop until the form stops changing (max N) so a fourth pass is not silently needed. | Low |
| 4 | 119-124 | B5 | Returns `actions` counts; the test asserts on them. Fine; no receipt ceremony here. | None. | – |

## Proposed end state
Unchanged harness, one model, one per-model test. When `calendar-adapter-fixture.mjs` stops probing closure text (its own report),
this file keeps working because it only uses `f.exports`, `f.calendar`, shell fields and timers. Add a one-line assumptions
note about the stubbed `refreshReminders`. Lane: run when the six manifest sources, `DayAnchor.qnt` or the fixture change.
