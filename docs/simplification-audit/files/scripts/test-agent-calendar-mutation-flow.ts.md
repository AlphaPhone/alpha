# scripts/test-agent-calendar-mutation-flow.ts
- Lines: 154 | Kind: integration (real `AgentCalendar`, `app-record-route-policy`, `agent-calendar-view` with a synthetic API/port) plus a few pure-algorithm cases | Verdict: MOVE to `test/agent-calendar.test.ts` (merge), delete the shim `test/agent-calendar-mutation.test.mjs`
- Covers: Agent Calendar serialises writes (refuses a concurrent create, releases on failure), agent-side sync review/select/resume with revision fences and refusals on changed destination/owner/draft, exact route allow-list for `sync-control`, and editor time round-trips including DST. Duplicates: partial with `test/calendar-sync-settings-navigation.test.mjs`, `google-calendar-link-status.test.mjs` (check during merge). Callers: `test/agent-calendar-mutation.test.mjs:6` (spawns `node --import tsx` on this file, T9).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 | A real `node:test` suite living in `scripts/`, launched by a 9-line shim that spawns a child process. | Move to `test/agent-calendar.test.ts` (run directly by `npm test`, which already globs `test/*.test.ts`); delete the shim. | Low |
| 2 | 13-30, 76 | A1 | Fixtures drive `CalendarPreservation.capture`/`retainedReadOnly` and a `legacy-only` record: the legacy calendar authority preservation that stage A1 deletes (`agent-calendar.ts:71,107`). | When A1 lands, drop the preservation argument from the fixtures; the "pending reservation covers the first await" case then needs a different first await (the API create) or goes. | Medium (depends on A1 outcome). |
| 3 | 105-110 | T3 | Route allow-list cases call `assertAppRecordRequestAllowed` directly. | Keep: it is a security boundary and cheap; fold into the same file. | — |
| 4 | 112-154 | T3 | Pure editor-timing algorithm (1,440-minute loop, DST spring/fall). | Keep: only coverage of a risky pure algorithm (DST ambiguity) that a journey cannot reach economically. | — |
| 5 | 18, 68 | C1 | `as unknown as AppRecordPort`, `any` in fixtures. | Type the fixture against `AppRecordPort`. | — |

## Proposed end state
`test/agent-calendar.test.ts` with: write serialisation (overlap refused, failure releases), sync
select→resume with revision fence, refusal on destination/owner/context change, route allow-list, editor
timing (minute round-trip, cross-day move, DST endpoints, repeated-hour refusal).
