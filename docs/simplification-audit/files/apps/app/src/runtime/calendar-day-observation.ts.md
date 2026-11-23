# apps/app/src/runtime/calendar-day-observation.ts
- Lines: 19 | Role: builds the optional `calendarDay` turn observation (visible civil day) only when the canonical Calendar home is plainly visible | Verdict: SIMPLIFY (minor)
- Importers: prototype/agent-adapter.ts, prototype/agent-calendar-adapter.ts. Text/path pins: `test/calendar-day-context.test.mjs`, feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 14 | D9/D8 | One 420-char guard with 22 conditions. | Split into `surfaceVisible(surface)` and `calendarIdle(state)` named predicates. | None. |
| 2 | 17 | C3 | `YYYY-MM-DD` formatting inline; twin unused `date` helper in agent-calendar-view.ts:7 and `toISOString().slice(0,10)` in calendar-form-draft.ts:28. | Shared `isoDate(parts)` in a calendar-dates helper. | None. |
| 3 | 18 | B1 (keep) | `catch{return;}` — an invalid zone omits optional context (spec: lookup context only). | Keep with a short comment. | — |
| 4 | 5 | A7 | `CalendarDaySurface` exported, 0 external importers. | Unexport or keep as parameter type (callers use literals). | None. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `CalendarDaySurface` | interface | 5-10 | none | keep |
| ISO date formatting | helper | 17 | agent-calendar-view.ts:7 | calendar-dates.ts |

## Proposed end state
~22 formatted lines with two named predicates and shared date formatting.

## Verification
`test/calendar-day-context.test.mjs`, `test/client-observation-handshake.test.mjs` (consumer of the observation).
