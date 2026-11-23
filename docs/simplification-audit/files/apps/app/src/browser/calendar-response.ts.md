# apps/app/src/browser/calendar-response.ts
- Lines: 8 | Role: guest-response type, labels, and the imperative dialog to change one guest's local response. | Verdict: SIMPLIFY
- Importers: 2 (`calendar.ts:10`, `calendar-records.ts:1` type only). Text/path pins: `test/browser/calendar-accessibility.spec.ts`, `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-7 | C4 | Two lines hiding ~30 statements: theme-token copy `['bg','fg','s2','line']`, dark detection, the alpha-back/pagehide/device-state/visibility listener set and teardown, focus restore, `document.body.append`. | Shared `openOwnedDialog`. | Medium (back-capture semantics) |
| 2 | 3 | C6 | Response keys `added/invited/yes/maybe/no` repeated as a literal list in `calendar-backup.ts:33`. | Use `Object.hasOwn(calendarResponses,…)` (already done in `calendar.ts:163`); the backup copy goes with D3. | None |
| 3 | 6 | D12 | `label.style.cssText='display:flex;…'`. | CSS. | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `CalendarResponse` | type | 2 | none | move next to `CalendarRecord` (records imports it back) |

## Proposed end state
Type + labels + ~6 lines of dialog logic over the kit; optionally one `calendar-dialogs.ts` with the meeting dialog.

## Verification
`test/browser/dev-calendar-response.spec.ts`, `test/browser/dev-calendar-guests.spec.ts`.
