# test/calendar-managed-rejection.test.mjs
- Lines: 95 | Kind: integration (prepared SDK graph from `agent:prepare`, esbuild bundle of upstream `plugins/plugin-calendar/src/mutations/managed.ts` with two port stubs, then the real `scripts/gmail-agent-dev-broker.ts` on a loopback HTTP server) | Verdict: KEEP, SIMPLIFY; target `test/integration/resident-runtime.test.ts` (prepared-SDK lane)
- Covers: an explicit Cloud Calendar rejection survives Alpha's private loopback broker as a typed not-accepted error; uncertain replies stay blocked and nothing replays. Duplicates: refusal classification also in `test/calendar-agent-write-host.test.mjs` (DELETE) and upstream tests. Callers/importers: `npm test` glob (skips unless prepared); `.github/workflows/resident-prepare.yml:43` runs it alone with `ALPHA_REQUIRE_PREPARED_SDK=1` behind `scripts/ci/resident-phase.py`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 25-37, 92-93 | B5 | Evidence ceremony: `verifySource` before and after, zod realpath and bun.lock version match, "pinned source not edited" byte compare. | Delete; `agent:prepare` already verifies the graph. | None |
| 2 | 40-41 | T1 | Regex on upstream source (`raw\.calendarFailure`). | Delete. | None |
| 3 | 42-75 | T5 / P5 | First half exercises upstream `createManagedCalendarMutationPort` with a fake `fetch`: upstream's unit. | Delete; keep the broker leg (76-91), which is Alpha's code path. | Low |
| 4 | 76-91 | - | Real broker, real HTTP, real upstream port: the actual regression. | Keep. | None |
| 5 | 78 | D13 | Imports `.eliza/client-features/.../managed-calendar-host.ts` by path. | `@eliza/*` alias. | None |
| 6 | 23 | T9 | Skip knob `ALPHA_REQUIRE_PREPARED_SDK`; in plain `npm test` it always skips. | Put it in the prepared-SDK lane only, no skip logic. | Low |
| 7 | 12-21 | A8 | Long history comment ("once carried as a patch"). | One sentence. | None |

## Proposed end state
About 30 lines in the prepared-SDK integration file: start the dev broker with a synthetic Cloud client that rejects,
call the upstream managed mutation port through it, assert `CalendarMutationNotAcceptedError` and one write. No
provenance checks, no upstream regex, no skip switch; the lane runs it after `agent:prepare`.
