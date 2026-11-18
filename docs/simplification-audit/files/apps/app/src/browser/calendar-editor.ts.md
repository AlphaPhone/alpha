# apps/app/src/browser/calendar-editor.ts
- Lines: 49 | Role: imperative modal editor for a browser-calendar event (fields, all-day toggle, repeat, alert, attendees, draft retention). | Verdict: SIMPLIFY
- Importers: 1 (`browser/calendar.ts:13`). Text/path pins: `test/browser/calendar-accessibility.spec.ts`, `test/browser/review-visual-viewport.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 10-11, 45-48 | C4 | Dialog kit by copy: `createElement('dialog')`, theme-token loop `for(const token of ['bg','fg','s2','line','mut'])`, dark detection `.toUpperCase()==='#000000'`, `alpha-back`/`pagehide`/`visibilitychange`/`alpha:device-state` add/remove lists, focus restore, `document.body.append`. | `openOwnedDialog({label,className,mount:'.os'})` returning `{dialog,signal,close}`. | Medium (back-button capture order must stay `true`) |
| 2 | 39, 42 | C3 | Attendee checkbox row built twice (initial list and `restoreFields` for unknown ids). | `addPerson(id,name)` helper. | None |
| 3 | 35-36 | C6 | Repeat options `none/daily/weekdays/weekly` and alert options `0/10/60` repeat lists in `calendar-recurrence.ts`, `calendar.ts:232,237`, `calendar-alerts.ts:7`. | Import `calendarRepeats` / `CALENDAR_ALERT_MINUTES` with a label map. | None |
| 4 | 5-6 | C1 / A7 | `EditableCalendarEvent` re-declares a subset of `CalendarRecord`; both it and `CalendarPerson` are exported but have no importer outside. | `type EditableCalendarEvent=Pick<CalendarRecord,…>`; drop exports. | None |
| 5 | 12, 18, 35-40 | D8 / D12 | 300-700-character lines; inline `style` on the close icon. | Format; move to CSS. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `EditableCalendarEvent` | interface | 5 | `CalendarRecord` (`calendar-records.ts:5`) | `Pick<CalendarRecord,…>` |
| `CalendarPerson` | type | 6 | `{id,name}` people lists in `calendar.ts:135` | keep local |
| `field()` overloads | helper | 14-19 | form field builders in `prototype/*` imperative dialogs | dialog kit |

## Proposed end state
~40 lines: uses the shared dialog kit and shared calendar constants, no token copy, one attendee-row builder.

## Verification
`test/browser/dev-calendar-editor.spec.ts`, `calendar-accessibility.spec.ts`, `calendar-end-after-start.spec.ts`, `calendar-modal-draft.spec.ts`, `dev-calendar-all-day-save.spec.ts`.
