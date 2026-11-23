# apps/app/src/prototype/calendar-form-inputs.ts
- Lines: 32 | Role: Pure conversions between the Calendar form's day offset/hours model (`{off,t,d}`) and native `date`/`time` input values; default event start; guest email validation. | Verdict: KEEP (MOVE to `runtime/calendar-form-inputs.ts` as pure domain code — D11)
- Importers: 3 — `prototype/model.js:24` (all four functions), `calendar-adapter.ts:2` (`calendarDefaultEventStart`), `agent-calendar-adapter.ts` (`calendarDefaultEventStart`, `calendarGuestEmail`).
- Text/path pins: `specs/quint/refinement/application/calendar-form-controls.mjs:5,8` (imports the functions and pins the path), `specs/quint/application/manifest.json:3917`; `test/calendar-form-inputs.test.mjs:4` and `test/scanned-calendar-handoff.test.mjs:10` (esbuild bundles `export * from './apps/app/src/prototype/calendar-form-inputs'`); `test/support/feature-parity.mjs:35` (owner `model.js`) and `:354`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2-3 | C3 | `DAY=86400000` and `civil=(date)=>Date.UTC(date.getFullYear(),…)` — two of the 10 civil-day copies. | Import from `runtime/civil-date.ts`. | None. |
| 2 | 7 | C3 | `readDate` (`YYYY-MM-DD`, `T12:00:00Z`, round-trip check) duplicates `calendar-approval-fields.ts:9 dateText` validation. | Shared `parseCivilDate`. | None. |
| 3 | 29-32 | C3 (twin owner) | `calendarGuestEmail` is the stricter guest rule; `calendar-adapter.ts:238` uses its own looser regex for handed-off guests. | Make this the single rule and use it at `calendar-adapter.ts:238`. | Low. |
| 4 | 1 | C1 | Local `type Form={off:number;t:number;d:number}` — the Calendar form shape is untyped elsewhere (`Bag`). | Export `CalendarFormTime` and reuse in the draft codecs (`runtime/calendar-form-draft.ts`). | None. |
| 5 | — | D11 | Pure module under `prototype/`. | Move to `runtime/` (update Quint `calendar-form-controls.mjs`, the two test bundles, feature-parity and the three importers). | Low (path churn only). |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Form` | type | 1 | untyped forms in calendar adapters, `runtime/calendar-form-draft.ts` | exported `CalendarFormTime` |
| `DAY` | const | 2 | `calendar-adapter.ts:17`, `calendar-interval-presentation.ts:4` | `runtime/civil-date.ts` |
| `civil` | helper | 3 | 10 copies | `runtime/civil-date.ts` |
| `dateValue`, `timeValue`, `minutes` | helpers | 4-6 | `HH:MM` formatting in `automations-adapter.ts:55` | keep (or `civil-date.ts`) |
| `readDate`, `readTime` | helpers | 7-8 | `calendar-approval-fields.ts:9`, HH:MM regexes in `automations-adapter.ts` | `runtime/civil-date.ts` |
| `calendarGuestEmail` | helper | 29-32 | regex at `calendar-adapter.ts:238` | here (single rule) |

## Proposed end state
≈28 lines in `runtime/calendar-form-inputs.ts`, importing civil-date helpers; same exported API.

## Verification
Quint `calendar-form-controls` refinement, `test/browser/calendar-form-controls.spec.ts`, `test/calendar-form-inputs.test.mjs`, `test/scanned-calendar-handoff.test.mjs`, `npm run verify`.
