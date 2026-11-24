# specs/quint/legacy/core/check-single-flight-refinement.mjs
- Lines: 195 | Kind: Quint refinement harness (historical/legacy family; imports and runs real upstream `AgentRuntime`) | Verdict: DELETE (with legacy retirement)
- Covers: 4-5 schedules of upstream `AgentRuntime.getRoom` / `getMemories` / `updateRoom` through `roomReadMemo` / `roomMessagesMemo` (single-flight read memo, invalidation fence on write) against `specs/quint/legacy/CoreSingleFlightMemo.qnt` (+ `Safety` profile), with a controlled fake adapter.
- Duplicates: no alphaphone current-source model of the read memo exists (`grep -r SingleFlightMemo|roomReadMemo specs/quint/services specs/quint/refinement/services` finds nothing). Upstream covers it in `vendor/eliza/packages/core/test/read-memo-runtime.test.ts`.
- Callers/importers: `specs/quint/refinement/legacy/index.mjs:22` and `test/quint-single-flight-refinement.test.mjs:3` (T4: runs twice). Has its own CLI entry (lines 193-195), invoked by nothing.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 147-149 | P6, T5 | Tests upstream runtime memo behaviour only; the model is a translation of a retired upstream TLA spec. | Delete with model, manifest entry and test wrapper. | Low; upstream owns the memo and has a runtime test. |
| 2 | 193-195 | A7 | `process.argv[1] === ...` CLI entry has no caller (`git grep check-single-flight-refinement` shows only the two imports). | Delete. | None |
| 3 | 10-40 | T3 | The adapter is a hand-written stub around the runtime; it checks memo concurrency rules, which is a unit-level property of upstream code. | Delete. | None |
| 4 | 182-188 | B5 | `sources`/`driverHashes` receipts and asserted `assumptions` prose. | Delete. | None |

## Proposed end state
Deleted with `specs/quint/legacy/CoreSingleFlightMemo.qnt`, its manifest entry, the index row and `test/quint-single-flight-refinement.test.mjs`. Record in the PR that single-flight memo semantics are upstream-owned and covered by `vendor/eliza/packages/core/test/read-memo-runtime.test.ts`; nothing in alphaphone loses coverage of its own code.
