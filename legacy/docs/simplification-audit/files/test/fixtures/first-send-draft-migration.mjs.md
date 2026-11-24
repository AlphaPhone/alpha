# test/fixtures/first-send-draft-migration.mjs
- Lines: 104 | Kind: transplant (slices `settleFirstSendSlot` out of `agent-adapter.ts`, runs it in vm against the real upstream `compareExchangeDraftStore`) | Verdict: DELETE as a test fixture; Quint harness PORTs
- Covers: on the first send of a new chat, the composer draft moves from the room-less slot to the new room's slot with CAS, retries at 150/600/1500 ms, never overwrites the destination, stops when retired or rebound. This is a live mechanism, not a legacy migration (A1 does not apply despite the name). Duplicates: none known. Callers/importers: `test/first-send-draft-migration.test.mjs` (research: delete, C), live Quint `specs/quint/refinement/application/first-send-draft-migration.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 29-31 | T2/T10 | Slice from `'function settleFirstSendSlot('` to the next `'/**\n * A new chat'` in `agent-adapter.ts` (present). | PORT: export `settleFirstSendSlot` from a composer-draft module; harness imports it and injects `assistantDraftStore`/`setTimeout`. | High for the agent-adapter split. |
| 2 | 72 | - | Pins retry delays `[150, 600, 1500]`. | Keep in the Quint harness only (model detail). | - |
| 3 | 8 | D13 | Deep `.eliza/client-features/...durable-draft.ts` path. | Alias. | none |

## Proposed end state
Delete with the host test. The Quint driver imports the exported function. Journey: `journeys/chat.spec.ts` "type a draft in a new chat, send, the next draft in that room starts empty and the old room-less draft is gone".
