# apps/app/src/runtime/calendar-availability.ts
- Lines: 20 | Role: pure re-export of upstream `plugin-calendar/src/client/availability-review.ts` with a descriptive comment | Verdict: DELETE
- Importers: prototype/agent-adapter.ts:39 (`executeCalendarAvailability`, `AvailabilityProvider`), prototype/calendar-availability-review.ts:3 (types). Text/path pins: `scripts/test-calendar-availability-flow.ts:5`, `scripts/test-calendar-availability-provider-rows.ts:8`, `test/browser/calendar-availability.spec.ts:220` (in-page import of `/src/runtime/calendar-availability.ts`), feature-parity inventory. `test/calendar-availability.test.mjs`, `test/calendar-availability-reader.test.mjs` reference the name.

## Findings
| # | Lines | Pattern | Finding (with snippet) | Change | Risk |
|---|---|---|---|---|---|
| 1 | 6-20 | D4 | `export { abortablePause, …, type AvailabilitySource } from '…/availability-review.ts'` — no Alpha code (research P10). | Point the two importers and the two scripts/spec at upstream (via the `@eliza/*` alias once added); delete the file; remove from feature-parity. | None. |
| 2 | 7 | A7 | `abortablePause`, `AVAILABILITY_MAX_SOURCES`, `describeAvailabilityResult`, `parseAvailabilitySources`, `SOURCE_LIST_ATTEMPTS`, `SOURCE_LIST_RETRY_MS` are re-exported only for scripts. | Gone with the file. | None. |

## Local types and helpers
None.

## Proposed end state
File removed.

## Verification
`test/browser/calendar-availability.spec.ts`, `scripts/test-calendar-availability-flow.ts`, `test/calendar-availability.test.mjs`.
