# test/core-runtime-transform.test.mjs
- Lines: 28 | Kind: tooling / Quint-harness helper test (imports `specs/quint/refinement/services/core-runtime/module.mjs` loaders and `TURN_STATE_TARGET` from `scripts/core-state-patch.ts`) | Verdict: DELETE
- Covers: the refinement loaders apply the reviewed core-state transform to `packages/core/src/runtime/turn-controller.ts` and that two `TurnControllerRegistry` instances are isolated; then asserts per-file driver/source/output SHA-256 equalities for the agent and core runtime bundles. Duplicates: `specs/quint/refinement/services/core-runtime/turns.mjs` (loads the same registry via `loadTurnControllers` and replays the Quint turns model; run by `test/quint-core-turns.test.mjs` and `services/index.mjs`); `test/core-state-patch.test.mjs` (transform receipts). Callers/importers: `npm test` glob only.

## Findings
| # | Lines | Pattern | Finding | Change | Risk |
|---|---|---|---|---|---|
| 1 | 11-19 | T5 / T4 | Tests an upstream class (`TurnControllerRegistry`, `vendor/eliza/packages/core`) through the harness loader; the Quint turns replay already exercises the same loaded class much more thoroughly. | Delete. | Low |
| 2 | 20-27 | B5 | Hash equalities between driver, compiled and manifest hashes: evidence ceremony about the harness itself. A wrong transform already fails the replays that load it. | Delete. | Low |
| 3 | 4 | T5 | Tests test machinery (`specs/quint/refinement/**/module.mjs`). The legacy users of `module.mjs` (`specs/quint/legacy/core/*`) retire with P6. | If the harness loader needs a guard, it belongs in `test/quint/tooling.test.mjs`. | Low |

## Proposed end state
File deleted. Loader correctness is covered by the live `core-runtime/turns.mjs` and `embedding-store-identity.mjs`
replays; transform integrity by `test/core-state-patch.test.mjs`.
