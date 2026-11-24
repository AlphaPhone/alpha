# apps/app/src/prototype/calendar-month-focus.ts
- Lines: 25 | Role: Makes the Calendar month picker an inline modal (focus trap, inert background, Back closes it) and supplies month/year `<select>` choices. | Verdict: KEEP (MERGE into the calendar view owner when it exists — research §5 tiny-file list)
- Importers: 1 — `apps/app/src/main.tsx:17,177`.
- Text/path pins: `test/fixtures/modal-scrim-chromium.mjs:13` (re-exports `installCalendarMonthFocus` from this path), `specs/quint/application/manifest.json:1009,2778`, `specs/quint/application/README.md`, `test/support/feature-parity.mjs:356`; behaviour: `test/browser/calendar-month-focus.spec.ts`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6 | D10 | Focus return target found by visible label: `document.querySelector('button[aria-label="Month view"]')` — renaming the button's accessible name silently breaks focus return. | Give the template button a `data-calendar-month-trigger` attribute (or a ref) and select that. | Low; template edit. |
| 2 | 19-20 | NEW (use before definition) | `return {...out,monthModalRef:ref}` (19) refers to `const ref` declared on line 20; works only because render runs later. | Declare `ref` before `views.calendar.render`. | None. |
| 3 | 21-24 | D2 | Wraps `componentDidMount/componentWillUnmount` only to add/remove one `alpha-back` capture listener. | Register through the hook registry (D2) or attach the listener in `modal.ref` when the container mounts. | Low. |
| 4 | 5, 7, 19 | P6/D2 | Module `close`/`container` captures; render wrapper copies `out` (`{...out,…}`) while other calendar wrappers mutate `out`. | Mutate consistently (or always copy) inside the calendar owner's pipeline. | None. |
| 5 | 2, 4 | C1 | `type Bag`, `Component:any`. | Shared types. | None. |
| 6 | 13 | NEW (locale bypass, date-only) | `new Date(2000,month,1).toLocaleDateString(undefined,{month:'long'})` instead of `locale-time.ts monthNames('long')` (exists, `locale-time.ts:90`). | `monthNames('long')`. | Low (follows the app locale preference). |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `Bag` | type | 2 | ~45 files | `shell-types.ts` |
| month labels | inline | 13 | `locale-time.ts:90 monthNames` | `locale-time.ts` |
| `choose` (year/month bounds) | helper | 11 | none | keep |

## Proposed end state
≈22 lines: `monthNames`, a data-attribute focus target, `ref` declared first, lifecycle via the hook registry; later a section of `views/calendar/`.

## Verification
`test/browser/calendar-month-focus.spec.ts`, `test/fixtures/modal-scrim-chromium.mjs` users, accessibility sweep (focus return, Back), `npm run verify`.
