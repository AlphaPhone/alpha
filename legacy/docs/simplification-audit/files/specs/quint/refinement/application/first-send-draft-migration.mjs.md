# specs/quint/refinement/application/first-send-draft-migration.mjs
- Lines: 98 | Kind: Quint refinement harness over a source-transplant fixture (`test/fixtures/first-send-draft-migration.mjs` slices `agent-adapter.ts` from `'function settleFirstSendSlot('` to `'/**\n * A new chat'`, strips types and evals it) | Verdict: PORT
- Covers: the first-send draft source slot is cleared only by an exact-revision CAS after the destination copy is confirmed, and never after rebind, shell retirement or a newer source revision. Duplicates: `test/first-send-draft-migration.test.mjs` runs this campaign **and** four extra host cases that replay the same schedules through the fixture (T4); aggregate `index.mjs:42` runs it a third time. Callers/importers: `index.mjs`, `test/first-send-draft-migration.test.mjs`.
- Model: `FirstSendDraftMigration.qnt`, live (sources `prototype/agent-adapter.ts`, `runtime/assistant-draft-store.ts`, `vendor/.../durable-draft.ts`).

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 2 (fixture 27-31) | T2/T10 | Fixture slices `agent-adapter.ts` by a function header and the next doc comment's first line (both present today at lines 123 and 150, but `agent-adapter.ts` has a 426-line working-tree diff and is a god module slated for a split). | Move `settleFirstSendSlot` into its own module (e.g. `apps/app/src/runtime/first-send-slot.ts`, exported) and import it in the fixture; `agent-adapter.ts` imports it too. | Med |
| 2 | 13-15 | B5 | Hashes driver, fixture, `support.mjs`, `upstream.lock.json`, `prepare-client-features.ts`. | Drop with receipts. | Low |
| 3 | test file | T4/B5 | The test asserts `receipt.traces === 11` (exact count) and repeats the rebind/retire/replace schedules as plain host tests. | Keep only the model test; assert `> 0`. | Low |
| 4 | fixture | A7 | After the host test is trimmed, the fixture's only importer is this harness. | Move the fixture next to the harness. | Low |

## Proposed end state
Fixture imports the exported `settleFirstSendSlot` and the prepared `compareExchangeDraftStore`; no slicing. Eleven scenarios
unchanged. One test case. Lane: the new module, `assistant-draft-store.ts`, upstream lock, model.
