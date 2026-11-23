# apps/app/src/runtime/agent-calendar-view.ts
- Lines: 48 | Role: maps canonical LifeOps calendar events to prototype row shape and builds create/patch commands from the editor form | Verdict: SIMPLIFY
- Importers: only `prototype/agent-calendar-adapter.ts`. Text/path pins: `test/agent-calendar-refresh-state.test.mjs:11-13` slices source text from `export function canonicalHomeCalendar(` and evals it (T2); `scripts/test-agent-calendar-mutation-flow.ts`; `test/scanned-calendar-handoff.test.mjs`; `specs/quint/application/manifest.json` sources (1015, 2576); feature-parity inventory.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 7 | A7 | `const date=(p)=>\`${p.year}-…\`` is never called (grep `date(` in the file: 0 hits; L37 declares a local `date` that shadows it). | Delete line 7. | None. |
| 2 | 48 | A7 | `canonicalHomeCalendar` has no importer in apps/ (whole-repo grep: only the T2 slice in `test/agent-calendar-refresh-state.test.mjs`). | Delete the function and the slice-based test block. | Low. |
| 3 | 23-28 vs 31-47 | C3 | `calendarFormRange` and `calendarFormPatch` each validate start/duration (L25 vs L36) and each define an `at(minutes)` converter (L26 vs L37-40). The validations already differ: L25 `Number.isFinite(durationMinutes)`, L36 `Number.isSafeInteger(durationMinutes)`. | One `validTiming(form)` and one `instant(form, minutes, original?)`; use `isSafeInteger` in both (minutes are integers from `calendarFormMinutes`). | Low; confirm no caller passes fractional minutes. |
| 4 | 23 | A7 | `calendarFormRange` is exported but has no importer outside this file. | Unexport. | None. |
| 5 | 11 | D8 | 760-character object literal on one line. | Format. | None. |
| 6 | 6 | C3 | `civil(p)` day number twin of `day()` in calendar-form-draft.ts:8 and the date formatting in calendar-day-observation.ts:17. | Shared civil-date helpers module (`calendar-dates.ts`). | Low. |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? | Proposed home |
|---|---|---|---|---|
| `DAY` | const | 5 | `86400000` literals in calendar-form-draft.ts:28,33,38 | calendar-dates.ts |
| `civil` | helper | 6 | calendar-form-draft.ts:8 `day` | calendar-dates.ts |
| `date` | helper | 7 | calendar-day-observation.ts:17 inline; unused here | delete here; isoDate in calendar-dates.ts |
| `CanonicalCalendarForm` | type | 19 | prototype form `Bag`s in calendar-form-draft.ts (`Form`) | keep here |

## Proposed end state
~38 lines: row mapping, editor timing, minutes rounding, create/patch builders sharing one timing validator and one instant converter; no dead `date`, no `canonicalHomeCalendar`.

## Verification
`test/agent-calendar-refresh-state.test.mjs` (drop the canonicalHomeCalendar slice), `test/scanned-calendar-handoff.test.mjs`, `scripts/test-agent-calendar-mutation-flow.ts`, Playwright calendar editor specs.
