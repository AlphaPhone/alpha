# specs/quint/legacy/core/check-fact-write-dedupe-refinement.mjs
- Lines: 271 | Kind: Quint refinement harness (legacy model; also hosts a fixture imported by a LIVE services harness) | Verdict: MERGE fixture into `specs/quint/refinement/services/fact-write-scope.mjs`, DELETE the rest
- Covers: real `AgentRuntime.createMemory` fact dedupe (upstream `RuntimeDataMutations` FIFO per room) on disk-backed PGlite, all 6 writer orders x empty/prefilled, against `legacy/CoreFactWriteDedupe.qnt`, plus "boundaries" (failure releases tail, independent rooms, 120-row lookup, two runtimes duplicate). Duplicates: `refinement/services/fact-write-scope.mjs` (live `services/FactWriteScope.qnt`) drives the same fixture with 4 writers, two rooms and two runtimes, i.e. a superset of the boundary cases. Callers/importers: `specs/quint/refinement/legacy/index.mjs:14`, `specs/quint/refinement/services/fact-write-scope.mjs:5-6` (imports `createFactWriteFixture`, `reachFactWriteBoundary`, `factText`, `factEvidence`) and `:11` (hashes this file as `fixtureSource`), `test/quint-fact-write-dedupe-refinement.test.mjs:3`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 17-123, 271 | P6, (§2.10 live dependency) | A live services harness imports its fixture from the legacy tree, so the legacy tree cannot be deleted until it moves. | Move `gate`, `evidence`, `reach`, `fixture`, `text` (lines 17-123) into `fact-write-scope.mjs` (or `refinement/services/fact-write/fixture.mjs`), update its `fixtureSource` hash input. | Low: mechanical move; FactWriteScope receipt hash inputs change once. |
| 2 | 17-21 | C3 | Local `gate()` (37 twins per research). | Use the shared `refinement/support.mjs` gate when it exists. | None. |
| 3 | 125-233 | T4 | `sourceTrace` + `boundaries` overlap FactWriteScope's schedules; boundaries are assertions without a model. | Delete with the CoreFactWriteDedupe campaign. | Low: FactWriteScope keeps the cross-runtime and failure cases. |
| 4 | 47-72 | T6-like | Monkey-patches `adapter.getMemories/createMemories/updateMemories` to hold SQL calls: acceptable for a refinement harness (real modules, held ports). | Keep in the moved fixture. | — |
| 5 | whole | §2.9 | Code under test is upstream-only (not in `CORE_STATE_TARGETS`). | Owner may later move FactWriteScope upstream too (D14); not in this change. | — |

## Proposed end state
`fact-write-scope.mjs` owns the ~100-line fixture; this file, `legacy/CoreFactWriteDedupe.qnt` + manifest entry, the index row and `test/quint-fact-write-dedupe-refinement.test.mjs` are deleted. `test/quint-fact-write-scope.test.mjs` keeps passing.
