# scripts/fixtures/inbox-memory.ts
- Lines: 17 | Kind: test support (in-memory compare-exchange `InboxOperationStore`, with an optional `beforeRead` gate) | Verdict: MERGE into a new `test/support/memory-slot-store.ts` shared by every in-memory compare-exchange fake
- Covers: a durable-slot store for Inbox operation and draft tests. Duplicates: `scripts/fixtures/cloud-delegation/native.ts:9-29` (same JSON-compare CAS on `localStorage`), and the many per-test `compareExchange` fakes counted under C4. Callers/importers: `scripts/inbox-adapter-fixture.ts`, `scripts/test-inbox-sent-cleanup.ts`, `scripts/test-inbox-grant-withdrawal.ts`, `scripts/test-inbox-cloud-flow.ts`, `scripts/test-inbox-drafts-browser.ts`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 3-17 | C4 | One of several hand-written "compare by JSON, then set or delete" stores. | One `memorySlotStore(map, {beforeRead})` in `test/support/`; this file and the CAS in `cloud-delegation/native.ts` use it. | L |
| 2 | 1 | D13 | Type import from `../../.eliza/client-features/plugins/plugin-inbox/...` (generated upstream output). | Use the planned `@eliza/*` alias after the move. | L |

## Proposed end state
`test/support/memory-slot-store.ts` (about 20 lines). Several importers are transplant suites (`inbox-adapter-fixture.ts`, `test-inbox-grant-withdrawal`,
`test-inbox-sent-cleanup` use `prototype-script.ts`) and go with T2; the shared store survives as long as one integration test (for example
`test-inbox-drafts-browser`, which drives a real page) needs a memory slot store.
