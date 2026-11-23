# specs/quint/refinement/application/calendar-agent-selection.mjs
- Lines: 112 | Kind: Quint ITF replay driver (bundled real calendar adapter via `calendar-adapter-fixture.mjs`) | Verdict: KEEP
- Covers: which Calendar event or source the assistant is handed: only the open event, retired inspections dropped, refresh re-inspects, late source answers dropped, against `CalendarAgentSelection.qnt` (30 walks + 4 witnesses + 4 goals). Duplicates: none at this level. Callers/importers: `test/quint-calendar-agent-selection.test.mjs` (not in aggregate).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 36-40, 51-56 | T10 | Reads `f.probe.selection()` — the closure text injection of the fixture. | Use `shell.calendarSelection()` (already asserted at 59-66) plus behaviour-based epoch checks after the fixture port. | M |
| 2 | 15 | — | Rebuilds the adapter's row-id format `calendar:${event}:${begin}`; coupled to an internal id scheme. | Read the id from the rendered row instead. | L |
| 3 | 2 | C5 | Uses `calendar-itf.mjs` (to merge into the shared trace module). | Follow the merge. | L |
| 4 | — | A2 / D4 | Exercises `refreshAgentCalendar` and `alpha:calendar-committed` — the agent-side path D4 keeps, not the deleted client sync stack. Survives D4. | — | — |

## Proposed end state
Unchanged traces; observation through public adapter API; shared trace module.
