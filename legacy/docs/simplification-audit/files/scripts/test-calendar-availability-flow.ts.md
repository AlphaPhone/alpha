# scripts/test-calendar-availability-flow.ts
- Lines: 259 | Kind: integration (real `executeCalendarAvailability` and real `DeviceActions` client over in-memory provider, review, request and journal) + one source-text block | Verdict: MOVE to `test/calendar-availability.test.ts` (node:test cases), delete lines 57-65 and the shim `test/calendar-availability.test.mjs`
- Covers: the reviewed free/busy check reads only owner-chosen calendars, never shares titles/names/accounts, handles all-day by local civil day, refuses on permission/time-zone/stale screen/changed calendar/unknown freshness, retries only an unavailable list, and journals+uploads exactly the reviewed result. Duplicates: `test/browser/calendar-availability.spec.ts` (UI journey); `test/calendar-availability-reader.test.mjs` (JVM reader). Callers/importers: `test/calendar-availability.test.mjs` (via `runChildSuite`); comment in `apps/app/src/runtime/phone-context.ts:131`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 57-65 | T1 | Reads `connection-ui.tsx`/`phone-context.ts` text and counts `=await deviceCapabilities(` (3), `,runForegroundReview);` (3) and an exact `export const ... = '...'` line. | Delete. Replace with one import assertion: `phone-context.CALENDAR_AVAILABILITY_CAPABILITY === contracts.CALENDAR_AVAILABILITY_CAPABILITY`, or better import the contract constant in `phone-context.ts` and drop the copy (C6). | L |
| 2 | whole | T9 | Top-level asserts in block scopes, run through a child-suite shim; failures are one stderr blob. | Wrap each block in `test()`; delete shim. | L |
| 3 | 212-217 | T3 | `parseAvailabilityEvents/Sources` validator asserts are unit checks of the trust boundary; the "leaky provider" and "forged choice" cases already exercise them through the executor. | Keep 2 (extra field, bound) and drop the rest. | L |
| 4 | 220-258 | — | The DeviceActions block is the valuable integration: review runs only after journal claim, receipt equals journal. Uses `any` for journal/request fakes (C1). | Keep; type fakes with the exported interfaces. | L |
| 5 | 207-208 | T8 | `abortablePause(600000)` aborted after 5 ms: fine, no real wait. | Keep. | L |

## Proposed end state
`test/calendar-availability.test.ts` with ~12 named cases (privacy, all-day, permission, zone, cancel, stale, freshness, retry policy, DeviceActions receipt), no source-text reads, no child process. Comment in `phone-context.ts:131` updated.
