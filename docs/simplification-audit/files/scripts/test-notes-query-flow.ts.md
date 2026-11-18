# scripts/test-notes-query-flow.ts
- Lines: 45 | Kind: integration (upstream `DocumentNotesStore` over a real file compare-exchange port + real `executeNotesQuery`, `shareable`, `DeviceActions`; chooser and proposal HTTP are fixtures) | Verdict: KEEP as the base of `test/integration/notes-agent-actions.test.ts` (absorbs `test-notes-action-flow.ts`)
- Covers: agent "latest note" query shares only the chosen note's text, empty/no-match succeed without a chooser, uncertain dates ask the owner, concurrent insertion/owner change/cancel refuse, checklist with empty body is not shareable, capability negotiation and journal-before-read with receipt-only recovery. Duplicates: Quint notes query models; no browser spec drives `notes_query`. Callers/importers: `test/adapter-contracts.test.mjs` (spawn shim).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | whole | T9 | Self-asserting script behind the adapter-contracts shim. | `test()` cases in the merged file. | None |
| 2 | 13-15, 36-40 | C3 | File port, journal and proposal fakes duplicated with `test-notes-action-flow.ts`. | One harness. | None |
| 3 | 13 | C3 | Inline SHA-256 hex. | Shared `sha256Hex`. | None |
| 4 | 12, 37-40 | C1 | `records:any[]`, `create:any`, `input:any`. | Upstream types. | None |
| 5 | 32 | T3 | Direct `shareable(...)` unit asserts duplicate what line 33 proves through the executor. | Drop line 32. | None |

## Proposed end state
`test/integration/notes-agent-actions.test.ts` (~90 lines): one harness, ~8 cases from this file plus the three from the action flow.
