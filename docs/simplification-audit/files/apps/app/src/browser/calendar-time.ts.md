# apps/app/src/browser/calendar-time.ts
- Lines: 4 | Role: civil-time helpers: wall clock of an instant in a zone, strict civil parse, and zone-aware civil→instant with gap/overlap rules. | Verdict: KEEP
- Importers: 5 (`calendar.ts`, `calendar-alerts.ts`, `calendar-editor.ts`, `calendar-records.ts`, `calendar-recurrence.ts`). Text/path pins: `test/support/feature-parity.mjs`.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 1 | C3 | `calendarWall` builds an `en-GB` `formatToParts` wall clock per call; `development-digest-occurrence.ts:34` `wall()` is the same algorithm at minute precision with a cached formatter; `calendar.ts:205` has a third local `civil`. | One `civilWall(at,zone,{seconds})` with a per-zone formatter cache here; dev digests import it. | Low |
| 2 | 1-4 | D8 | Three dense one-liners, `calendarInstant` ~600 characters. | Format (D9 Prettier commit). | None |

## Local types and helpers
| Name | Kind | Lines | Twin elsewhere? (paths) | Proposed home |
|---|---|---|---|---|
| `calendarWall` | helper | 1 | `development-digest-occurrence.ts:34` `wall` | here |
| `civil` | helper | 2 | `development-digest-occurrence.ts:36` `civil`, `calendar.ts:205` `civil` | here |

## Proposed end state
4 lines (~30 formatted), with a cached formatter and one shared wall helper for calendar and dev digests.

## Verification
`test/calendar-recurrence.test.mjs`, `test/calendar-view-rules.test.mjs`, `test/digest-occurrence-delivery.test.mjs`.
