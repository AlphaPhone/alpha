# specs/quint/refinement/services/fact-write-scope.mjs
- Lines: 185 | Kind: Quint refinement harness (real upstream `AgentRuntime`, `RuntimeDataMutations`, isolated PGlite) | Verdict: KEEP (upstream-only), PORT the fixture out of `legacy/`
- Covers: room-scoped fact-write dedupe lanes: 119/120-row SQL window, two runtimes, distinct rooms, precommit refusal and retry, against `FactWriteScope.qnt`. Duplicates: `specs/quint/legacy/core/check-fact-write-dedupe-refinement.mjs` + `test/quint-fact-write-dedupe-refinement.test.mjs` (legacy twin over the same upstream code). Callers: `services/index.mjs`, `test/quint-fact-write-scope.test.mjs`.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 5-6, 12 | P6 | Imports `createFactWriteFixture`, `reachFactWriteBoundary`, `factText`, `factEvidence` from `specs/quint/legacy/core/check-fact-write-dedupe-refinement.mjs` (271 lines). Retiring `legacy/` breaks this live harness. | Move the fixture (`fixture`, `reach`, `text`, `evidence`) into `refinement/services/fact-write-fixture.mjs`; delete the legacy checker and its test. | Low |
| 2 | — | T4 | Legacy `FactWriteDedupe` and live `FactWriteScope` model the same upstream unit. | Keep `FactWriteScope` only. | Low |
| 3 | — | P1 / §2.9 | Sources `vendor/eliza/**` only. | Upstream-pin lane. | Low |
| 4 | 173-184 | — | `obligations` consumed only by the aggregate. | Delete with the aggregate. | Low |

## Proposed end state
Same scenarios on a fixture that lives under `refinement/services/`, run by `test/quint-fact-write-scope.test.mjs` when the upstream pin changes.
