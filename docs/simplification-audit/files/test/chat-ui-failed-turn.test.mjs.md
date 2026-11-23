# test/chat-ui-failed-turn.test.mjs
- Lines: 105 | Kind: transplant + source-text (slices `effectAppliedBeforeFailure`, `mergeConversationDelivery`, the `send` failure boundary from `connection-ui.tsx` and a catch body from `agent-adapter.ts`; 9 `assert.match` regexes over statement layout) | Verdict: DELETE; carry 3 cases to `journeys/chat.spec.ts`
- Covers: a failed turn after a committed effect says "Done … reply cut off" instead of a generic failure; recorded user row identity is adopted so a re-read does not duplicate the bubble; a Cloud billing refusal replaces upstream prose and shows the manage-plan card. Duplicates: `test/browser/chat-continuity.spec.ts` (row identity), `test/browser/resident-failures.production.spec.ts` ("Choose plan"/billing). Callers/importers: `npm test` glob only; uses `test/fixtures/browser-source.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 31-42, 61-65 | T1 | Regexes pin exact minified statements (`if(effectApplied){const mapped=…`). Every formatter run breaks them. | Delete. | None |
| 2 | 13-14, 18, 33, 44, 63, 88 | T2 | Seven text slices with string end markers. | Delete. | None |
| 3 | 68-85 | T3 | Re-implements the adapter's adoption logic inline (lines 73-74) and then tests `merge`; only `merge` is product code. | Delete. | None |
| 4 | 20-28 | T3 | `effectAppliedBeforeFailure` receipt semantics (rolled-back is not applied, malformed proves nothing) is a real rule. | Journey: dev agent creates an event then fails the reply -> bubble starts "Done" and the event exists; with a rolled-back receipt -> generic failure. | Medium: needs dev-agent failure injection with receipts. |
| 5 | 87-105 | T3 | Billing refusal copy and card. | `journeys/connection-cloud.spec.ts` (from `resident-failures.production.spec.ts`): streamed partial then billing refusal -> one bubble, Cloud's text, manage card. | Low |

## Proposed end state
Deleted. Three chat/cloud journey steps: effect-applied failure copy, one bubble after a failed-turn re-read, billing
refusal card. `mergeConversationDelivery` loses its direct table; the re-read journey covers it.
